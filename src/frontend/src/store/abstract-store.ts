import { map, type WritableAtom, computed, type ReadableAtom } from 'nanostores';

interface Store<T extends Record<PrimaryKeys | IndexKeys, any>, PrimaryKeys extends string = string, IndexKeys extends string = PrimaryKeys> {
  primaryKeys: Record<PrimaryKeys, Record<string, T>>;
  indexKeys: Record<IndexKeys, Record<string, T[]>>;
}

export abstract class AbstractStore<T extends Record<PrimaryKeys | IndexKeys, any>, PrimaryKeys extends string = string, IndexKeys extends string = PrimaryKeys> {
  private readonly store: WritableAtom<Store<T, PrimaryKeys, IndexKeys>>;

  private readonly primaryKeys: PrimaryKeys[];
  private readonly indexKeys: IndexKeys[];

  readonly items: ReadableAtom<T[]>;

  constructor(primaryKeys: PrimaryKeys[], indexKeys: IndexKeys[]) {
    if (primaryKeys.length === 0) {
      throw new Error('Primary keys must be defined');
    }

    this.primaryKeys = primaryKeys;
    this.indexKeys = indexKeys;

    this.store = map<Store<T, PrimaryKeys, IndexKeys>>(this.emptyStoreObject());

    // This assumes the first primary key's values represent all unique items.
    // Ensure consistency if multiple primary keys exist and you expect `items` to reflect all entries.
    this.items = computed(this.store, (store) => {
      if (this.primaryKeys.length > 0) {
        return Object.values(store.primaryKeys[this.primaryKeys[0]]);
      }
      return [];
    });
  }

  private emptyStoreObject() {
    return {
      primaryKeys: this.primaryKeys.reduce((acc: Record<PrimaryKeys, Record<string, T>>, key: PrimaryKeys) => {
        acc[key] = {} as Record<string, T>;
        return acc;
      }, {} as Record<PrimaryKeys, Record<string, T>>),
      indexKeys: this.indexKeys.reduce((acc: Record<IndexKeys, Record<string, T[]>>, key: IndexKeys) => {
        acc[key] = {} as Record<string, T[]>;
        return acc;
      }, {} as Record<IndexKeys, Record<string, T[]>>),
    };
  }

  getBy(key: PrimaryKeys, value: string): ReadableAtom<T | null> {
    return computed(this.store, (store) => store.primaryKeys[key][value] || null);
  }

  addOrUpdate(...itemsToAdd: T[]): void {
    if (itemsToAdd.length === 0) {
      return; // No items to add/update
    }

    const currentStore = this.store.get();

    // Deep copy existing primaryKeys to avoid direct mutation
    const newPrimaryKeys: Record<PrimaryKeys, Record<string, T>> = {};
    for (const pk of this.primaryKeys) {
      newPrimaryKeys[pk] = { ...currentStore.primaryKeys[pk] };
    }

    // Add or update items in newPrimaryKeys
    for (const item of itemsToAdd) {
      for (const pk of this.primaryKeys) {
        newPrimaryKeys[pk][item[pk]] = item;
      }
    }

    // Deep copy existing indexKeys to avoid direct mutation
    const newIndexKeys: Record<IndexKeys, Record<string, T[]>> = {};
    for (const ik of this.indexKeys) {
      // For each index key, we need to copy the *entire* inner map and then update its arrays
      newIndexKeys[ik] = {};
      for (const indexValue in currentStore.indexKeys[ik]) {
        // Ensure we copy the array itself
        newIndexKeys[ik][indexValue] = [...currentStore.indexKeys[ik][indexValue]];
      }
    }

    // Update newIndexKeys with itemsToAdd
    for (const item of itemsToAdd) {
      for (const ik of this.indexKeys) {
        const indexValue = item[ik];
        if (!newIndexKeys[ik][indexValue]) {
          newIndexKeys[ik][indexValue] = [];
        }
        // Check if the item already exists in the array (e.g., for updates)
        const existingIndex = newIndexKeys[ik][indexValue].findIndex(
          (existingItem) => this.primaryKeys.some((pk) => existingItem[pk] === item[pk]) // Assuming at least one primary key matches
        );

        if (existingIndex !== -1) {
          // Replace existing item
          newIndexKeys[ik][indexValue][existingIndex] = item;
        } else {
          // Add new item
          newIndexKeys[ik][indexValue].push(item);
        }
      }
    }

    this.store.set({
      primaryKeys: newPrimaryKeys,
      indexKeys: newIndexKeys,
    });
  }


  getByIndex(indexKey: IndexKeys, value: string): ReadableAtom<T[]> {
    return computed(this.store, (store) => store.indexKeys[indexKey][value] || []);
  }

  delete(primaryKeyToDeleteBy: PrimaryKeys, ...idsToDelete: string[]): void {
    if (idsToDelete.length === 0) {
      return; // No IDs to delete
    }

    const currentStore = this.store.get();

    // 1. Identify all items to be deleted using the provided primaryKey and ids.
    const itemsToDelete: T[] = [];
    const idsSet = new Set(idsToDelete); // For efficient lookup
    const deletedPrimaryItemIds: Set<string> = new Set(); // To track actual primary items being removed

    // Create a mutable copy for primary keys
    const newPrimaryKeys: Record<PrimaryKeys, Record<string, T>> = {};
    for (const pk of this.primaryKeys) {
      newPrimaryKeys[pk] = { ...currentStore.primaryKeys[pk] }; // Shallow copy of inner map
    }

    for (const id of idsToDelete) {
      const item = currentStore.primaryKeys[primaryKeyToDeleteBy][id];
      if (item) {
        itemsToDelete.push(item);
        deletedPrimaryItemIds.add(item[primaryKeyToDeleteBy]); // Add the ID of the actual item being removed
        // Remove from all primary key maps
        for (const pk of this.primaryKeys) {
          if (newPrimaryKeys[pk]) { // Check if the primary key exists in newPrimaryKeys (should always for valid PKeys)
             // Using delete directly on a shallow copied object is fine for atom updates
            delete newPrimaryKeys[pk][item[pk]];
          }
        }
      }
    }

    if (itemsToDelete.length === 0) {
      return; // No matching items found to delete
    }

    // 2. Update indexKeys by filtering out the deleted items.
    const newIndexKeys: Record<IndexKeys, Record<string, T[]>> = {};
    for (const ik of this.indexKeys) {
      newIndexKeys[ik] = {};
      for (const indexValue in currentStore.indexKeys[ik]) {
        const currentArray = currentStore.indexKeys[ik][indexValue];
        // Filter out items that match any of the primary keys of the itemsToDelete
        const filteredArray = currentArray.filter(
          (item) => !itemsToDelete.some((deletedItem) =>
            this.primaryKeys.some((pk) => item[pk] === deletedItem[pk])
          )
        );
        if (filteredArray.length > 0) {
          newIndexKeys[ik][indexValue] = filteredArray;
        }
      }
    }

    this.store.set({
      primaryKeys: newPrimaryKeys,
      indexKeys: newIndexKeys,
    });
  }

  clear() {
    this.store.set(this.emptyStoreObject());
  }
}
