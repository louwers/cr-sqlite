import { Config } from "./Types";
import DB from "./private/DB";

export default class DBCache {
  private readonly activeDBs = new Map<string, [number, DB]>();
  private readonly intervalHandle: NodeJS.Timeout;

  constructor(private readonly config: Config) {
    this.intervalHandle = setInterval(() => {
      const now = Date.now();
      for (const [dbid, entry] of this.activeDBs.entries()) {
        if (now - entry[0] > config.cacheTtlInSeconds * 1000) {
          entry[1].close();
          this.activeDBs.delete(dbid);
        }
      }
    }, config.cacheTtlInSeconds * 1000);
  }

  /**
   * DBCache evicts after some TTL. Thus users should not hold onto
   * references to DBs for long periods of time. Instead, they should
   * get a DB from the cache, do their work, and then release it.
   * @param dbid
   * @returns
   */
  getDb(dbid: string): DB {
    let entry = this.activeDBs.get(dbid);
    if (entry == null) {
      entry = [Date.now(), new DB(this.config, dbid)];
      this.activeDBs.set(dbid, entry);
    } else {
      entry[0] = Date.now();
    }

    return entry[1];
  }

  destroy() {
    clearInterval(this.intervalHandle);
    for (const [_, db] of this.activeDBs.values()) {
      try {
        db.close();
      } catch (e) {
        console.error(e);
      }
    }
    this.activeDBs.clear();
  }
}