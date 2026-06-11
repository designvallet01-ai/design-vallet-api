import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xxfjeysjcrgmukcpkmjk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_RveM2OwDIIMfY7KJfWXHNQ_iCkexI4r';

const isMock = supabaseUrl.includes('mockproject') || !supabaseKey;

// --- Built-in In-Memory Mock Datastore for local offline runs ---
const mockDb = {
  users: [
    {
      id: 1,
      email: 'designvallet01@gmail.com',
      password_hash: '$2a$10$oR1r2zB4p7K7bH46XN9M3.rF6jB3b6u.c8vU2R.oFv.1m64n91Z.e', // admin123
      full_name: 'GUDURU PAVAN',
      phone_number: '9052572363',
      is_admin: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      email: 'gowrinarayanaguduru@gmail.com',
      password_hash: '$2a$10$oR1r2zB4p7K7bH46XN9M3.rF6jB3b6u.c8vU2R.oFv.1m64n91Z.e', // admin123
      full_name: 'G. GOWRINARAYANA (ELITE WEB KINGDOM)',
      phone_number: '9985369590',
      is_admin: true,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      email: 'user@designvallet.com',
      password_hash: '$2a$10$zYcE/p/6r5U2sD99G9W1XeVhL7h1tH8G1e59p1tH8G1e59p1tH8G1e', // user123
      full_name: 'Jane Doe',
      phone_number: '+1987654321',
      is_admin: false,
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      email: 'admin@designvallet.com',
      password_hash: '$2a$10$oR1r2zB4p7K7bH46XN9M3.rF6jB3b6u.c8vU2R.oFv.1m64n91Z.e', // admin123
      full_name: 'System Admin',
      phone_number: '1234567890',
      is_admin: true,
      created_at: new Date().toISOString()
    }
  ],
  images: [
    {
      id: 1,
      title: 'Majestic Mountain Sunrise',
      description: 'Stunning sun rays breaking through snow-covered alpine mountain peaks at early dawn.',
      category: 'Border',
      price: 499.00,
      original_s3_key: 'originals/nature_mountain_sunrise_orig.jpg',
      preview_s3_key: 'previews/nature_mountain_sunrise_prev.jpg',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Neon Cyberpunk Alleyways',
      description: 'Vibrant pink and cyan neon signboards reflecting on wet concrete in a futuristic urban street.',
      category: 'Pallu',
      price: 299.00,
      original_s3_key: 'originals/urban_cyberpunk_neon_orig.jpg',
      preview_s3_key: 'previews/urban_cyberpunk_neon_prev.jpg',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Vibrant Abstract Fluid Art',
      description: 'Colorful swirling paint pigments creating intricate patterns of acrylic fluid dynamic movement.',
      category: 'Butta',
      price: 399.00,
      original_s3_key: 'originals/abstract_fluid_art_orig.jpg',
      preview_s3_key: 'previews/abstract_fluid_art_prev.jpg',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      title: 'Enigmatic Studio Portrait',
      description: 'High-contrast black and white fine-art portrait focusing on dramatic side lighting and facial expressions.',
      category: 'Broket',
      price: 599.00,
      original_s3_key: 'originals/portrait_studio_bw_orig.jpg',
      preview_s3_key: 'previews/portrait_studio_bw_prev.jpg',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  orders: [],
  order_items: [],
  downloads: [],
  transactions: [],
  coupons: [
    { id: 1, code: 'SAVE10', discount_percent: 10, is_active: true, expires_at: new Date(Date.now() + 1000*60*60*24*365).toISOString() },
    { id: 2, code: 'WELCOME50', discount_percent: 50, is_active: true, expires_at: new Date(Date.now() + 1000*60*60*24*365).toISOString() }
  ]
};

// Helper functions for parsing selections and populating relations recursively in mock mode
function parseSelect(selectStr) {
  if (!selectStr || selectStr.trim() === '*') return true;
  // Normalize whitespace
  const normalized = selectStr.replace(/\s+/g, ' ');
  const fields = {};
  let currentField = '';
  let depth = 0;
  let subSelect = '';
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === '(') {
      depth++;
      if (depth === 1) {
        continue;
      }
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        fields[currentField.trim()] = parseSelect(subSelect);
        currentField = '';
        subSelect = '';
        continue;
      }
    }
    
    if (depth > 0) {
      subSelect += char;
    } else {
      if (char === ',') {
        if (currentField.trim()) {
          fields[currentField.trim()] = true;
        }
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField.trim()) {
    fields[currentField.trim()] = true;
  }
  return fields;
}

function populateRow(table, row, selectConfig) {
  if (!row) return row;
  const newRow = {};
  const copyAll = selectConfig === true;
  
  for (const key of Object.keys(row)) {
    if (copyAll || selectConfig[key] === true || selectConfig[key] !== undefined) {
      newRow[key] = row[key];
    }
  }
  
  if (copyAll) return newRow;
  
  for (const key of Object.keys(selectConfig)) {
    const val = selectConfig[key];
    if (typeof val === 'object') {
      const relationName = key;
      const relationData = resolveRelation(table, row, relationName, val);
      newRow[relationName] = relationData;
    }
  }
  
  return newRow;
}

function resolveRelation(table, row, relationName, selectConfig) {
  if (table === 'orders' && relationName === 'order_items') {
    const items = mockDb.order_items.filter(item => item.order_id === row.id);
    return items.map(item => populateRow('order_items', item, selectConfig));
  }
  if (table === 'order_items' && relationName === 'images') {
    const img = mockDb.images.find(img => img.id === row.image_id);
    return img ? populateRow('images', img, selectConfig) : null;
  }
  if (table === 'orders' && relationName === 'users') {
    const user = mockDb.users.find(u => u.id === row.user_id);
    return user ? populateRow('users', user, selectConfig) : null;
  }
  if (table === 'downloads' && relationName === 'users') {
    const user = mockDb.users.find(u => u.id === row.user_id);
    return user ? populateRow('users', user, selectConfig) : null;
  }
  if (table === 'downloads' && relationName === 'images') {
    const img = mockDb.images.find(img => img.id === row.image_id);
    return img ? populateRow('images', img, selectConfig) : null;
  }
  if (table === 'downloads' && relationName === 'orders') {
    const ord = mockDb.orders.find(o => o.id === row.order_id);
    return ord ? populateRow('orders', ord, selectConfig) : null;
  }
  return null;
}

// Custom Chain Builder replicating Supabase Javascript queries syntax
class SupabaseQueryChain {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = 'select'; // select, insert, update, delete
    this.payload = null;
    this.singleRow = false;
    this.orderCol = null;
    this.orderAscending = true;
    this.limitVal = null;
    this.selectStr = '*';
  }

  select(selectStr) {
    if (this.operation === 'select') {
      this.operation = 'select';
    }
    this.selectStr = selectStr || '*';
    return this;
  }

  insert(data) {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  update(data) {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  in(col, valList) {
    this.filters.push({ type: 'in', col, val: valList });
    return this;
  }

  match(object) {
    Object.keys(object).forEach(k => {
      this.filters.push({ type: 'eq', col: k, val: object[k] });
    });
    return this;
  }

  or(filterStr) {
    this.filters.push({ type: 'or', filterStr });
    return this;
  }

  order(col, options = {}) {
    this.orderCol = col;
    this.orderAscending = options.ascending ?? true;
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  async then(onfulfilled) {
    try {
      const data = await this.execute();
      return onfulfilled({ data, error: null });
    } catch (err) {
      return onfulfilled({ data: null, error: err });
    }
  }

  async execute() {
    let dataset = mockDb[this.table];
    if (!dataset) return [];

    if (this.operation === 'select') {
      let filtered = [...dataset];
      
      // Apply filters
      for (const filter of this.filters) {
        if (filter.type === 'eq') {
          filtered = filtered.filter(row => {
            const rowVal = row[filter.col];
            if (rowVal === undefined) return false;
            return rowVal.toString().toLowerCase() === filter.val.toString().toLowerCase();
          });
        } else if (filter.type === 'in') {
          filtered = filtered.filter(row => {
            const rowVal = row[filter.col];
            if (rowVal === undefined) return false;
            return filter.val.map(v => v.toString().toLowerCase()).includes(rowVal.toString().toLowerCase());
          });
        } else if (filter.type === 'or') {
          // parse simple e.g. "google_id.eq.X,email.eq.Y" OR "title.ilike.%search%,description.ilike.%search%"
          const parts = filter.filterStr.split(',');
          filtered = filtered.filter(row => {
            return parts.some(p => {
              const matches = p.trim().match(/^(\w+)\.(\w+)\.(.+)$/);
              if (!matches) return false;
              const col = matches[1];
              const op = matches[2];
              const val = matches[3];
              if (op === 'eq') {
                return row[col]?.toString().toLowerCase() === val.toLowerCase();
              } else if (op === 'ilike') {
                const searchVal = val.replace(/%/g, '').toLowerCase();
                return row[col]?.toString().toLowerCase().includes(searchVal);
              }
              return false;
            });
          });
        }
      }

      // Apply ordering
      if (this.orderCol) {
        filtered.sort((a, b) => {
          const valA = a[this.orderCol];
          const valB = b[this.orderCol];
          if (valA < valB) return this.orderAscending ? -1 : 1;
          if (valA > valB) return this.orderAscending ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (this.limitVal) {
        filtered = filtered.slice(0, this.limitVal);
      }

      const selectConfig = parseSelect(this.selectStr);

      if (this.singleRow) {
        const row = filtered[0] || null;
        return row ? populateRow(this.table, row, selectConfig) : null;
      }

      return filtered.map(row => populateRow(this.table, row, selectConfig));
    }

    if (this.operation === 'insert') {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = [];
      const selectConfig = parseSelect(this.selectStr);
      for (const item of records) {
        const newItem = {
          id: dataset.length + 1,
          ...item,
          created_at: new Date().toISOString()
        };
        if (this.table === 'downloads') {
          newItem.downloaded_at = new Date().toISOString();
        }
        dataset.push(newItem);
        const populated = populateRow(this.table, newItem, selectConfig);
        inserted.push(populated);
      }
      return this.singleRow ? inserted[0] : inserted;
    }

    if (this.operation === 'update') {
      // Find rows matching filters and modify them
      let affected = [];
      const selectConfig = parseSelect(this.selectStr);
      dataset.forEach(row => {
        const matchesFilters = this.filters.every(f => row[f.col]?.toString().toLowerCase() === f.val?.toString().toLowerCase());
        if (matchesFilters) {
          Object.assign(row, this.payload);
          const populated = populateRow(this.table, row, selectConfig);
          affected.push(populated);
        }
      });
      return affected;
    }

    if (this.operation === 'delete') {
      const beforeLength = dataset.length;
      mockDb[this.table] = dataset.filter(row => {
        const matchesFilters = this.filters.every(f => row[f.col]?.toString().toLowerCase() === f.val?.toString().toLowerCase());
        return !matchesFilters;
      });
      return { affectedRows: beforeLength - mockDb[this.table].length };
    }

    return [];
  }
}

let dbInstance = null;

if (isMock) {
  console.log('⚠️ Supabase credentials set to mock. Active built-in local query SDK wrapper.');
  dbInstance = {
    from(table) {
      return new SupabaseQueryChain(table);
    }
  };
} else {
  dbInstance = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase Production Client Initialized.');
}

const db = dbInstance;
export default db;
export { mockDb, isMock };
