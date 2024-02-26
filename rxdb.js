import {
    replicateWebRTC,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';
import nodeDatachannelPolyfill from 'node-datachannel/polyfill';
import { WebSocket } from 'ws';
import {
    getCRDTSchemaPart,
    RxDBcrdtPlugin
} from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb';
addRxPlugin(RxDBcrdtPlugin);

import { createRxDatabase } from 'rxdb';
import {
    getRxStorageMongoDB
} from 'rxdb/plugins/storage-mongodb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';

const database = await createRxDatabase({
    name: 'testdb',
    // storage: getRxStorageMemory(),
    storage: getRxStorageMongoDB({
        connection: 'mongodb://localhost:27017'
    }),
    multiInstance: false
});

database.$.subscribe(changeEvent => console.dir(changeEvent));

// create a schema with the CRDT options
const mySchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        points: {
            type: 'number',
            maximum: 100,
            minimum: 0
        },
        crdts: getCRDTSchemaPart() // use this field to store the CRDT operations
    },
    required: ['id', 'points'],
    crdt: { // CRDT options
        field: 'crdts'
    }
}

await database.addCollections({
        users: {
            schema: mySchema
        }
    });

await database.users.insert({
    id: 'foo',
    points: 1
});

database.users.$.subscribe(changeEvent => console.dir(changeEvent));

const replicationPool = await replicateWebRTC(
    {
        collection: database.users,
        // The topic is like a 'room-name'. All clients with the same topic
        // will replicate with each other. In most cases you want to use
        // a different topic string per user.
        topic: 'testdata',
        /**
         * You need a collection handler to be able to create WebRTC connections.
         * Here we use the simple peer handler which uses the 'simple-peer' npm library.
         * To learn how to create a custom connection handler, read the source code,
         * it is pretty simple.
         */
        connectionHandlerCreator: getConnectionHandlerSimplePeer({
            // Set the signaling server url.
            // You can use the server provided by RxDB for tryouts,
            // but in production you should use your own server instead.
            signalingServerUrl: 'ws://localhost:15555/',
            wrtc: nodeDatachannelPolyfill,
            webSocketConstructor: WebSocket
        }),
        isPeerValid: async (peer) => {
            return true;
        },
        pull: {},
        push: {}
    }
);
replicationPool.error$.subscribe(err => { /* ... */ });

database.users.syncWebRTC()

async function run() {

}

await run()
