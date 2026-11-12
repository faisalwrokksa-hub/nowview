import { DurableObject } from 'cloudflare:workers';

/** One SQLite-backed Durable Object per Access principal + cryptographic room ID.
 * All state transitions execute synchronously on the room's single coordination point.
 * Revoked IDs are permanently tombstoned; no KV fallbacks or regional stale reads.
 */
export class NewViewSyncRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.ctx.storage.sql.exec(
   'CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), blob TEXT, expires_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)'
  );
 }
 state(){
  return this.ctx.storage.sql.exec('SELECT blob, expires_at, revoked FROM room WHERE id=1').toArray()[0]||null;
 }
 async read(){
  const row=this.state();
  if(row?.revoked)return {status:410};
  if(!row||row.expires_at<=Date.now()||!row.blob)return {status:404};
  return {status:200,blob:row.blob};
 }
 async create(blob){
  if(typeof blob!=='string'||blob.length>8000||!/^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{20,7950}$/.test(blob))
   return {status:400};
  const row=this.state(),now=Date.now();
  if(row?.revoked)return {status:410};
  if(row&&row.expires_at>now)return {status:409};
  const until=now+604800000;
  this.ctx.storage.sql.exec('INSERT INTO room(id,blob,expires_at,revoked) VALUES (1,?,?,0) ON CONFLICT(id) DO UPDATE SET blob=excluded.blob,expires_at=excluded.expires_at,revoked=0',blob,until);
  return {status:204};
 }
 async update(blob,expected){
  if(typeof blob!=='string'||blob.length>8000||!/^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{20,7950}$/.test(blob))
   return {status:400};
  if(typeof expected!=='string'||expected.length>8000||!/^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{20,7950}$/.test(expected))
   return {status:428};
  // Synchronous read/compare/conditional update ensures one device cannot
  // silently overwrite a newer encrypted layout. No await between these steps.
  const row=this.state(),now=Date.now();
  if(row?.revoked)return {status:410};
  if(!row||row.expires_at<=now||!row.blob)return {status:404};
  if(row.blob!==expected)return {status:409};
  this.ctx.storage.sql.exec('UPDATE room SET blob=?,expires_at=? WHERE id=1 AND revoked=0 AND blob=?',blob,now+604800000,expected);
  return {status:204};
 }
 async revoke(){
  const row=this.state();
  if(row?.revoked)return {status:410};
  // Tombstones never expire; a previously disclosed room capability cannot be revived.
  this.ctx.storage.sql.exec(
   'INSERT INTO room(id,blob,expires_at,revoked) VALUES (1,NULL,0,1) ON CONFLICT(id) DO UPDATE SET blob=NULL,expires_at=0,revoked=1'
  );
  return {status:204};
 }
}
