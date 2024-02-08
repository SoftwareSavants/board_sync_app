import { Board, Card, CardAction, CardProperty, Status } from "./types";


export const login = async (username: string, password: string) => {
    const url = `${process.env.MATTERMOST_SITEURL}/api/v4/users/login`;
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
    };
    const body = {
        login_id: username,
        password,
    };
    console.log(url)
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    const resBody = await res.json();
    const resHeaders = res.headers;
    return { resHeaders, resBody };
};


export const getBoardByName = async (token: string, teamId: string, name: string) => {

    const url = `${process.env.MATTERMOST_SITEURL}/plugins/focalboard/api/v2/teams/${teamId}/boards`;
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${token}`,
    };
    const res = await fetch(url, {
        method: 'GET',
        headers,
    });
    const boards: Board[] = await res.json();
    const board = boards.find((board) => board.title === name);
    if (!board) {
        throw new Error(`Board "${name}" not found`);
    }
    return board;
};

export const getCardByPullRequest = async (token: string, boardId: string, pullRequest: string) => {
    const url = `${process.env.MATTERMOST_SITEURL}/plugins/focalboard/api/v2/boards/${boardId}/cards`;
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${token}`,
    };
    const res = await fetch(url, {
        method: 'GET',
        headers,
    });
    const cards: Card[] = await res.json();
    let cardToAction = cards.find((card) => Object.values(card.properties).find((property) => property === pullRequest));

    return cardToAction;
}


export const getStatuses = async (token: string, boardId: string) => {
    const url = `${process.env.MATTERMOST_SITEURL}/plugins/focalboard/api/v2/boards/${boardId}`;
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${token}`,
    };
    const res = await fetch(url, {
        method: 'GET',
        headers,
    });
    if (!res) {
        throw new Error(`Statuses not found`);
    }
    const data = await res.json();
    const properties: CardProperty[] = data.cardProperties;
    const statusesObject = properties.find((property) => property.name === 'Status');

    if (!statusesObject) {
        throw new Error(`Statuses not found`);
    }
    const statuses: Status[] = statusesObject.options.map((status: Status) => (
        { id: status.id, value: status.value }
    ));
    return statuses;
}

export const getStatusPropertyId = (board: Board) => {
    const statusPropertyId: string = board.cardProperties.find((property: CardProperty) => property.name === 'Status')?.id!;
    return statusPropertyId;
}


export const performActionOnCard = async (token: string, board: Board, card: Card, statuses: Status[], action: CardAction) => {
    const url = `${process.env.MATTERMOST_SITEURL}/plugins/focalboard/api/v2/boards/${board.id}/blocks/${card.id}`;
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${token}`,
    };
    const toStatus = statuses.find((status) => status.value === action);
    const statusPropertyId = getStatusPropertyId(board);
    const properties = { ...card.properties, [statusPropertyId]: toStatus!.id };

    const body = {
        updatedFields: {
            properties: properties
        }
    }

    const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),

    });

    const resBody = await res.json();
    return resBody;
};


export const getTeamId = (repository: string): string => {
    switch (repository) {
        case 'careboard-flutter':
            return '9k3zuaeyuib8pfthfc4fbrgx8y';
        case 'careboard_app':
            return '9k3zuaeyuib8pfthfc4fbrgx8y';
        case 'todo-app':
            return 'g6q7abcqii8m3ybj7gemoub5kc';
        default:
            return '9k3zuaeyuib8pfthfc4fbrgx8y';
    }

}
export const getBoardName = (repository: string) => {
    switch (repository) {
        case 'careboard-flutter':
            return 'Development Roadmap';
        case 'careboard_app':
            return 'Development Roadmap';
        case 'todo-app':
            return 'Lorem Ipsum';
        default:
            return 'Development Roadmap';
    }
}