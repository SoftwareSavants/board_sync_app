export interface Payload {
    pull_request: {
        html_url: string;
    };
    review: {
        state: string;
    };
    repository: {
        name: string;
    };
}


export const enum CardAction {
    MoveToInProgress = 'In Progress',
    MoveToDone = 'Testing',
}

export interface Status {
    id: string;
    value: string;
}

export interface CardProperty {
    id: string;
    name: string;
    type: string;
    options: Status[];
}
export interface Board {
    id: string;
    name: string;
    title: string;
    cardProperties: CardProperty[];
}

export interface Card {
    id: string;
    properties: Record<string, string>;
}
