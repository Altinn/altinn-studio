interface ISelfLinks {
    apps: string;
}

interface IProcess {
    currentTask: string;
    isComplete: boolean;
}

interface IInstanceState {
    isDeleted: boolean;
    isMarkedForHardDelete: boolean;
    isArchived: boolean;
}

interface IDataLinks {
    apps: string;
}

interface IDatum {
    id: string;
    elementType: string;
    fileName: string;
    contentType: string;
    storageUrl: string;
    dataLinks: IDataLinks;
    fileSize: number;
    isLocked: boolean;
    createdDateTime: Date;
    createdBy: string;
    lastChangedDateTime: Date;
    lastChangedBy: string;
}

export interface IInstance {
    id: string;
    instanceOwnerId: string;
    selfLinks: ISelfLinks;
    appId: string;
    org: string;
    createdDateTime: Date;
    createdBy: string;
    lastChangedDateTime: Date;
    lastChangedBy: string;
    process: IProcess;
    instanceState: IInstanceState;
    data: IDatum[];
}
