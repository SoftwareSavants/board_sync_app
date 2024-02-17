// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import express, { NextFunction, Request, Response } from 'express';

// Shim for mattermost-redux global fetch access
global.fetch = require('node-fetch');

import { AppBinding, AppCallRequest, AppCallResponse, AppForm, AppManifest } from '@mattermost/types/apps';


import { Client4 } from '@mattermost/client';
import { getBoardByName, getCardByPullRequest, getStatuses, performActionOnCard, getBoardName, getTeamId } from './services';
import { Board, Card, CardAction, Payload, Status } from './types';
import { ErrorMiddleware, validator } from './helpers'

const host = process.env.APP_HOST || 'localhost';
const port = process.env.APP_PORT || 4000;

const app: express.Application = express();
app.use(express.json());

// Uncomment these lines to enable verbose debugging of requests and responses
import logger from './middleware/logger';
import { Post } from '@mattermost/types/posts';
import { Channel } from '@mattermost/types/channels';
import { HttpException } from './httpException';
app.use(logger);

app.use((req, res, next) => {
    const call: AppCallRequest = req.body;

    // This is used to interact with the Mattermost server in the docker-compose dev environment.
    // We ignore the site URL sent in call requests, and instead use the known site URL from the environment variable.
    if (call?.context?.mattermost_site_url && process.env.MATTERMOST_SITEURL) {
        call.context.mattermost_site_url = process.env.MATTERMOST_SITEURL;
    }

    next();
});

const manifest = {
    app_id: 'boards-sync',
    display_name: "Boards Sync",
    description: "An app to sync boards's status between Mattermost and github.",
    homepage_url: 'https://github.com/mattermost/mattermost-app-examples/typescript/hello-world',
    app_type: 'http',
    icon: 'icon.png',
    http: {
        root_url: `http://${host}:${port}`,
    },
    requested_permissions: [
        'act_as_bot',
    ],
    requested_locations: [
        '/channel_header',
        '/command',
    ],
} as AppManifest;

const form: AppForm = {
    title: "I'm a form!",
    icon: 'icon.png',
    fields: [
        {
            type: 'text',
            name: 'message',
            label: 'message',
            position: 1,
        },
    ],
    submit: {
        path: '/submit',
        expand: {
            acting_user: "all",
            acting_user_access_token: "all"
        }
    },
};

const channelHeaderBindings = {
    location: '/channel_header',
    bindings: [
        {
            location: 'send-button',
            icon: 'icon.png',
            label: 'send hello message',
            form,
        },
    ],
} as AppBinding;

const commandBindings = {
    location: '/command',
    bindings: [
        {
            icon: 'icon.png',
            label: 'boards-sync',
            description: manifest.description,
            hint: '[send]',
            bindings: [
                {
                    location: 'send',
                    label: 'send',
                    form,
                },
            ],
        },
    ],
} as AppBinding;

// Serve resources from the static folder
app.use('/static', express.static('./static'));

app.use(ErrorMiddleware)

app.get('/manifest.json', (req, res) => {
    res.json(manifest);
});

app.post('/bindings', (req, res) => {
    const callResponse: AppCallResponse<AppBinding[]> = {
        type: 'ok',
        data: [
            channelHeaderBindings,
            commandBindings,
        ],
    };

    res.json(callResponse);
});

type FormValues = {
    message: string;
}


app.post('/event-listener', validator, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload: Payload = req.body;
        if (!Object.keys(payload).length)
            return res.status(400).send('Missing payload');

        const client4 = new Client4();
        client4.setUrl(process.env.MATTERMOST_SITEURL!);
        client4.setToken(process.env.ACCESS_TOKEN!);

        const repositoryName: string = payload.repository.name;

        const board: Board = await getBoardByName(process.env.ACCESS_TOKEN!, getTeamId(repositoryName), getBoardName(repositoryName));

        const statuses: Status[] = await getStatuses(process.env.ACCESS_TOKEN!, board.id);

        const card: Card | undefined = await getCardByPullRequest(process.env.ACCESS_TOKEN!, board.id, payload.pull_request.html_url);
        if (!card)
            return;

        if (payload.review.state !== 'approved') {
            await performActionOnCard(process.env.ACCESS_TOKEN!, board, card, statuses, CardAction.MoveToInProgress);
            return res.json({ message: 'Card moved to in progress' });
        }

        await performActionOnCard(process.env.ACCESS_TOKEN!, board, card, statuses, CardAction.MoveToDone);

        return res.json({ message: 'Card moved to done' });
    } catch (e) {
        console.log(e)
        next(new HttpException(400, "something went wrong"))
    }
});

app.post('/submit', async (req, res) => {
    const call = req.body as AppCallRequest;

    const botClient = new Client4();
    botClient.setUrl(call.context.mattermost_site_url);
    botClient.setToken(call.context.bot_access_token);

    const formValues = call.values as FormValues;

    let message = 'Hello, world!';
    const submittedMessage = formValues.message;
    if (submittedMessage) {
        message += ' ...and ' + submittedMessage + '!';
    }

    const users = [
        call.context.bot_user_id,
        call.context.acting_user.id,
    ] as string[];

    let channel: Channel;
    try {
        channel = await botClient.createDirectChannel(users);
    } catch (e: any) {
        res.json({
            type: 'error',
            error: 'Failed to create/fetch DM channel: ' + e.message,
        });
        return;
    }

    const post = {
        channel_id: channel.id,
        message,
    } as Post;

    try {
        await botClient.createPost(post)
    } catch (e: any) {
        res.json({
            type: 'error',
            error: 'Failed to create post in DM channel: ' + e.message,
        });
        return;
    }

    const callResponse: AppCallResponse = {
        type: 'ok',
        text: 'Created a post in your DM channel.',
    };

    res.json(callResponse);
});

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});
