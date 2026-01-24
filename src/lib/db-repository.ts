import type { IDBPDatabase } from 'idb';
import { openTotpDatabase, type TOTPDBSchema } from './database';

/**
 * Generic repository base class for IndexedDB operations
 * Reduces duplication across storage classes
 *
 * Note: Type assertions are used for IDB operations because the IDB library's
 * typing system doesn't allow for clean generic store name handling.
 * These assertions are safe because:
 * 1. storeName is constrained to valid store names in implementations
 * 2. T is constrained to match the actual record types in the stores
 */
export abstract class DbRepository<T extends { id?: number }> {
  protected dbPromise: Promise<IDBPDatabase<TOTPDBSchema>>;
  protected abstract storeName: 'secrets' | 'accounts';

  constructor() {
    this.dbPromise = openTotpDatabase();
  }

  /**
   * Get a record by ID
   */
  async getById(id: number): Promise<T | undefined> {
    const db = await this.dbPromise;
    // Safe: storeName is constrained to valid store names, T matches the record type
    return (await db.get(this.storeName as never, id)) as T | undefined;
  }

  /**
   * Get all records from the store
   */
  async getAll(): Promise<T[]> {
    const db = await this.dbPromise;
    // Safe: storeName is constrained to valid store names, T matches the record type
    return (await db.getAll(this.storeName as never)) as T[];
  }

  /**
   * Add a new record to the store
   * Returns the auto-generated ID
   */
  async add(record: Omit<T, 'id'>): Promise<number> {
    const db = await this.dbPromise;
    // Safe: storeName is constrained to valid store names, record matches store schema
    // IDB returns IDBValidKey but our stores use auto-increment number keys
    return (await db.add(this.storeName as never, record as never)) as number;
  }

  /**
   * Update an existing record
   * Throws if record doesn't exist
   */
  async update(id: number, updates: Partial<T>): Promise<T> {
    const db = await this.dbPromise;
    // Safe: storeName is constrained to valid store names
    const existing = (await db.get(this.storeName as never, id)) as T | undefined;
    if (!existing) {
      throw new Error(`${this.storeName} record not found`);
    }
    // Safe: existing comes from the store, updates is Partial<T>, result is T
    const updated = { ...existing, ...updates } as T;
    await db.put(this.storeName as never, updated as never);
    return updated;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number): Promise<void> {
    const db = await this.dbPromise;
    // Safe: storeName is constrained to valid store names
    await db.delete(this.storeName as never, id);
  }

  /**
   * Count records in the store
   */
  async count(): Promise<number> {
    const db = await this.dbPromise;
    // Safe: storeName is constrained to valid store names
    return db.count(this.storeName as never);
  }
}
