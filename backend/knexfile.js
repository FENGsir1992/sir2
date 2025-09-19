// Knex configuration file
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'data', 'database.sqlite')
    },
    migrations: {
      directory: path.join(__dirname, 'dist', 'database', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'dist', 'database', 'seeds')
    },
    useNullAsDefault: true
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'data', 'database.sqlite')
    },
    migrations: {
      directory: path.join(__dirname, 'dist', 'database', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'dist', 'database', 'seeds')
    },
    useNullAsDefault: true,
    pool: {
      min: 2,
      max: 10
    }
  }
};
