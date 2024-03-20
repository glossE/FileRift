import Peer, {DataConnection} from "peerjs";
import {MessageArgsProps, message} from "antd";
import { ReactElement, JSXElementConstructor, ReactFragment, ReactPortal } from "react";

export enum DataType {
    FILE = 'FILE',
    OTHER = 'OTHER'

}
export interface Data {
    dataType: DataType;
    file?: Blob; // Mark file as optional
    fileName?: string;
    fileType?: string;
    message?: string;
    chunkIndex?: number;
    totalChunks?: number; // Mark totalChunks as optional
}


let peer: Peer | undefined
let connectionMap: Map<string, DataConnection> = new Map<string, DataConnection>();


export const PeerConnection = {
    getPeer: () => peer,
    startPeerSession: () => new Promise<string>((resolve, reject) => {
        try {
            peer = new Peer()
            peer.on('open', (id: string | PromiseLike<string>) => {
                console.log('My ID: ' + id)
                resolve(id)
            }).on('error', (err: { message: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | ReactFragment | ReactPortal | MessageArgsProps | null | undefined; }) => {
                console.log(err)
                message.error(err.message)
            })
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    closePeerSession: () => new Promise<void>((resolve, reject) => {
        try {
            if (peer) {
                peer.destroy()
                peer = undefined
            }
            resolve()
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    connectPeer: (id: string) => new Promise<void>((resolve, reject) => {
        if (!peer) {
            reject(new Error("Peer doesn't start yet"))
            return
        }
        if (connectionMap.has(id)) {
            reject(new Error("Connection existed"))
            return
        }
        try {
            let conn = peer.connect(id, {reliable: true})
            if (!conn) {
                reject(new Error("Connection can't be established"))
            } else {
                conn.on('open', function() {
                    console.log("Connect to: " + id)
                    connectionMap.set(id, conn)
                    resolve()
                }).on('error', function(err: any) {
                    console.log(err)
                    reject(err)
                })
            }
        } catch (err) {
            reject(err)
        }
    }),
    onIncomingConnection: (callback: (conn: DataConnection) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet");
        }
        peer.on('connection', function (conn) {
            peer = new Peer()
            console.log("Incoming connection: " + conn.peer);
            const dataConnection = peer.connect(conn.peer, { reliable: true });
            if (dataConnection) {
                connectionMap.set(conn.peer, dataConnection);
                callback(dataConnection);
            } else {
                console.error("Failed to establish data connection with peer: " + conn.peer);
            }
        });
    },
    onConnectionDisconnected: (id: string, callback: () => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id);
        if (conn) {
            conn.on('close', function () {
                console.log("Connection closed: " + id)
                connectionMap.delete(id)
                callback()
            });
        }
    },
    sendConnection: (id: string, data: Data): Promise<void> => new Promise((resolve, reject) => {
        if (!connectionMap.has(id)) {
            reject(new Error("Connection doesn't exist"));
        } else {
            const conn = connectionMap.get(id);
            if (conn && conn.open) { // Check if the connection is open
                try {
                    conn.send(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                // Listen for the 'open' event and then send the data
                const openListener = () => {
                    try {
                        conn?.send(data);
                        resolve();
                    } catch (error) {
                        reject(error);
                    } finally {
                        // Cleanup: remove the listener once data is sent
                        conn?.off('open', openListener);
                    }
                };
                conn?.on('open', openListener);
            }
        }
    }),
    onConnectionReceiveData: (id: string, callback: (data: Data) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet");
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist");
        }
        let conn = connectionMap.get(id);
        if (conn) {
            conn.on('data', function (receivedData: unknown) {
                console.log("Receiving data from " + id);
                let data = receivedData as Data;
                callback(data);
            });
        } else {
            throw new Error("Connection with ID " + id + " not found");
        }
    },
    sendFileInChunks: (id: string, file: File, onProgress: (progress: number) => void): Promise<void> => new Promise((resolve, reject) => {
        if (!connectionMap.has(id)) {
            reject(new Error("Connection didn't exist"));
        }
        try {
            let conn = connectionMap.get(id);
            if (conn) {
                const chunkSize = 1024 * 1024; // 1MB chunks
                const chunks = Math.ceil(file.size / chunkSize);
                let sentBytes = 0;

                const sendChunk = (chunkIndex: number) => {
                    if (chunkIndex >= chunks) {
                        resolve();
                        return;
                    }
                    const start = chunkIndex * chunkSize;
                    const end = Math.min(start + chunkSize, file.size);
                    const chunk = file.slice(start, end);
                    conn!.send({
                        dataType: DataType.FILE,
                        file: chunk,
                        fileName: file.name,
                        fileType: file.type,
                        chunkIndex,
                        totalChunks: chunks
                    });
                    sentBytes += chunk.size;
                    onProgress(sentBytes / file.size * 100);
                    sendChunk(chunkIndex + 1);
                };

                sendChunk(0);
            }
        } catch (err) {
            reject(err);
        }
    }),
/*
    sendConnectionWithProgress: (
        id: string,
        data: Data,
        onProgress: (progress: number) => void
    ): Promise<void> =>
        new Promise((resolve, reject) => {
            if (!connectionMap.has(id)) {
                reject(new Error("Connection doesn't exist"));
                return;
            }
            try {
                let conn = connectionMap.get(id);
                if (!conn || !conn.open) {
                    // If connection is not open, wait for the 'open' event
                    const openListener = () => {
                        try {
                            conn?.send(data);
                            resolve();
                        } catch (error) {
                            reject(error);
                        } finally {
                            // Cleanup: remove the listener once data is sent
                            conn?.off("open", openListener);
                        }
                    };
                    conn?.on("open", openListener);
                } else {
                    // If connection is already open, send data immediately
                    conn.send(data);
                    resolve();
                }
    
                // Assuming conn.send supports progress tracking
                onProgress(100); // Placeholder for progress update
            } catch (err) {
                reject(err);
            }
        }),
    

    // Modify the onConnectionReceiveData method to handle chunked data
    onConnectionReceiveDataWithProgress: (id: string, callback: (data: Data, progress: number) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet");
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist");
        }
        let conn = connectionMap.get(id);
        if (conn) {
            let receivedBytes = 0;
            conn.on('data', function (receivedData: unknown) {
                let data = receivedData as Data;
                if (data.dataType === DataType.FILE) {
                    const chunkSize = 1024 * 1024;
                    // Safely access file and totalChunks with optional chaining and provide default values
                    const fileSize = data.file?.size ?? 0;
                    const totalChunks = data.totalChunks ?? 1; // Assuming at least one chunk if totalChunks is undefined
                    receivedBytes += fileSize;
                    const totalSize = totalChunks * chunkSize; // Assuming chunkSize is known
                    const progress = receivedBytes / totalSize * 100;
                    callback(data, progress);
                }
            });
        } else {
            throw new Error("Connection with ID " + id + " not found");
        }
    }
    */
};

