import type { IDBPDatabase } from 'idb';
import { openTotpDatabase, type TOTPDBSchema, type TOTPStoreName } from './database';

/**
 * Generic repository base class for IndexedDB operations
 * Reduces duplication across storage classes
 */
export abstract class DbRepository<TStoreName extends TOTPStoreName> {
  protected dbPromise: Promise<IDBPDatabase<TOTPDBSchema>>;
  protected abstract storeName: TStoreName;

  constructor() {
    this.dbPromise = openTotpDatabase();
  }

  /**
   * Get a record by ID
   */
  async getById(id: number): Promise<TOTPDBSchema[TStoreName]['value'] | undefined> {
    const db = await this.dbPromise;
    return await db.get(this.storeName, id);
  }

  /**
   * Get all records from the store
   */
  async getAll(): Promise<TOTPDBSchema[TStoreName]['value'][]> {
    const db = await this.dbPromise;
    return await db.getAll(this.storeName);
  }

  /**
   * Add a new record to the store
   * Returns the auto-generated ID
   */
  async add(record: Omit<TOTPDBSchema[TStoreName]['value'], 'id'>): Promise<number> {
    const db = await this.dbPromise;
    return await db.add(this.storeName, record as never);
  }

  /**
   * Update an existing record
   * Throws if record doesn't exist
   */
  async update(
    id: number,
    updates: Partial<TOTPDBSchema[TStoreName]['value']>,
  ): Promise<TOTPDBSchema[TStoreName]['value']> {
    const db = await this.dbPromise;
    const existing = await db.get(this.storeName, id);
    if (!existing) {
      throw new Error(`${this.storeName} record not found`);
    }
    const updated = { ...existing, ...updates };
    await db.put(this.storeName, updated);
    return updated;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(this.storeName, id);
  }

  /**
   * Count records in the store
   */
  async count(): Promise<number> {
    const db = await this.dbPromise;
    return db.count(this.storeName);
  }
}
