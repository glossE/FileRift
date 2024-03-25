// peer.ts

import Peer, { DataConnection } from "peerjs";
import { message } from "antd";


type ProgressCallback = (progress: number) => void;

export enum DataType {
    FILE = 'FILE',
    OTHER = 'OTHER'
}

export interface Data {
    dataType: DataType
    file?: Blob
    fileName?: string
    fileType?: string
    message?: string
}

interface CustomDataConnection extends DataConnection {
    sendFileInChunks: (file: Blob, onProgressUpdate: (progress: number) => void) => Promise<void>;
}



let peer: Peer | undefined
let connectionMap: Map<string, CustomDataConnection> = new Map<string, CustomDataConnection>()

export const PeerConnection = {
    
    getPeer: () => peer,
    startPeerSession: () => new Promise<string>((resolve, reject) => {
        try {
            peer = new Peer()
            peer.on('open', (id) => {
                console.log('My ID: ' + id)
                resolve(id)
            }).on('error', (err) => {
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
            let conn = peer.connect(id, { reliable: true }) as CustomDataConnection;
            if (!conn) {
                reject(new Error("Connection can't be established"))
            } else {
                conn.on('open', function () {
                    console.log("Connect to: " + id)
                    connectionMap.set(id, conn)
                    resolve()
                }).on('error', function (err) {
                    console.log(err)
                    reject(err)
                })
            }
        } catch (err) {
            reject(err)
        }
    }),
    onIncomingConnection: (callback: (conn: CustomDataConnection) => void) => {
        peer?.on('connection', function (conn) {
            console.log("Incoming connection: " + conn.peer)
            connectionMap.set(conn.peer, conn as CustomDataConnection);
            callback(conn as CustomDataConnection);
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
            reject(new Error("Connection didn't exist"))
        }
        try {
            let conn = connectionMap.get(id);
            if (conn) {
                conn.send(data)
            }
        } catch (err) {
            reject(err)
        }
        resolve()
    }),
    onConnectionReceiveData: (id: string, callback: (f: Data) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id)
        if (conn) {
            conn.on('data', function (receivedData) {
                console.log("Receiving data from " + id)
                let data = receivedData as Data
                callback(data)
            })
        }
    },
    sendFileInChunks: async (id: string, file: File, progressCallback: ProgressCallback): Promise<void> => {
        const connection = connectionMap.get(id);
        if (!connection) {
            throw new Error("Connection does not exist");
        }

        const chunkSize = 16384;
        let offset = 0;

        const readSlice = (o: number) => {
            const slice = file.slice(offset, o + chunkSize);
            const reader = new FileReader();

            reader.onload = (event) => {
                if (!event.target || !(event.target instanceof FileReader)) {
                    throw new Error("Failed to read file slice");
                }

                const arrayBuffer = event.target.result as ArrayBuffer;
                connection.send(arrayBuffer);
                offset += arrayBuffer.byteLength;

                const progress = Math.min(100, Math.round((offset / file.size) * 100));
                progressCallback(progress);

                if (offset < file.size) {
                    readSlice(offset);
                }
            };

            reader.readAsArrayBuffer(slice);
        };

        readSlice(0);
    }
}
