import { Msg, tags } from "@vlcn.io/ws-common";
import SyncConnection from "./SyncConnection.js";
import DBCache from "./DBCache.js";
import { WebSocket } from "ws";
import Transport from "./Trasnport.js";

/**
 * A connection broker maps PartyKit connections to Database Sync connections
 * and dispatches messages from the PartyKitConnection to the appropriate
 * SyncConnection methods.
 */
export default class ConnectionBroker {
  #syncConnection: SyncConnection | null = null;
  readonly #dbCache;
  readonly #ws;
  readonly #room;

  constructor(ws: WebSocket, dbCache: DBCache, room: string) {
    this.#dbCache = dbCache;
    this.#ws = ws;
    this.#room = room;
  }

  handleMessage(msg: Msg) {
    const tag = msg._tag;
    switch (tag) {
      case tags.AnnouncePresence: {
        if (this.#syncConnection != null) {
          throw new Error(
            `A sync connection for ${this.#room} was already started`
          );
        }

        const syncConnection = new SyncConnection(
          this.#dbCache,
          new Transport(this.#ws),
          this.#room,
          msg
        );
        this.#syncConnection = syncConnection;
        syncConnection.start();
        return;
      }
      case tags.Changes: {
        // get our synced db from the cache
        // apply the changes
        // if no inbound stream is started, this'll start one.
        const syncConn = this.#syncConnection!;
        syncConn.receiveChanges(msg);
        return;
      }
      case tags.RejectChanges: {
        // get our synced db, tell it changes were rejected
        const syncConn = this.#syncConnection!;
        syncConn.changesRejected(msg);
        return;
      }
      case tags.StartStreaming: {
        throw new Error(
          `Illegal state -- servers do not process the "StartTreaming" message`
        );
        // the server does not process this message. It sends this message
        // to a client after a client has announced its presence.
        return;
      }
    }
  }

  close(ws: WebSocket) {
    this.#syncConnection?.close();
  }
}