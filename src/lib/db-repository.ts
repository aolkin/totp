import type { IDBPDatabase } from 'idb';
import { openTotpDatabase, type TOTPDBSchema } from './storage';

/**
 * Generic repository base class for IndexedDB operations
 * Reduces duplication across storage classes
 */
export abstract class DbRepository<T extends { id?: number }> {
  protected dbPromise: Promise<IDBPDatabase<TOTPDBSchema>>;
  protected abstract storeName: string;

  constructor() {
    this.dbPromise = openTotpDatabase();
  }

  /**
   * Get a record by ID
   */
  async getById(id: number): Promise<T | undefined> {
    const db = await this.dbPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.get(this.storeName as any, id) as Promise<T | undefined>;
  }

  /**
   * Get all records from the store
   */
  async getAll(): Promise<T[]> {
    const db = await this.dbPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.getAll(this.storeName as any) as Promise<T[]>;
  }

  /**
   * Add a new record to the store
   * Returns the auto-generated ID
   */
  async add(record: Omit<T, 'id'>): Promise<number> {
    const db = await this.dbPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.add(this.storeName as any, record as T) as Promise<number>;
  }

  /**
   * Update an existing record
   * Throws if record doesn't exist
   */
  async update(id: number, updates: Partial<T>): Promise<T> {
    const db = await this.dbPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const existing = await db.get(this.storeName as any, id);
    if (!existing) {
      throw new Error(`${this.storeName} record not found`);
    }
    const updated = { ...existing, ...updates } as T;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.put(this.storeName as any, updated);
    return updated;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number): Promise<void> {
    const db = await this.dbPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.delete(this.storeName as any, id);
  }

  /**
   * Count records in the store
   */
  async count(): Promise<number> {
    const db = await this.dbPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.count(this.storeName as any);
  }
}
