import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 安全添加列：仅当不存在时才添加
  const hasWorkflows = await knex.schema.hasTable('workflows');
  if (hasWorkflows) {
    const hasViewCount = await knex.schema.hasColumn('workflows', 'viewCount');
    if (!hasViewCount) {
      await knex.schema.alterTable('workflows', (table) => {
        table.integer('viewCount').notNullable().defaultTo(0).index();
      });
    }

    const hasFavoriteCount = await knex.schema.hasColumn('workflows', 'favoriteCount');
    if (!hasFavoriteCount) {
      await knex.schema.alterTable('workflows', (table) => {
        table.integer('favoriteCount').notNullable().defaultTo(0).index();
      });
    }
  }

  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasIsAdmin = await knex.schema.hasColumn('users', 'isAdmin');
    if (!hasIsAdmin) {
      await knex.schema.alterTable('users', (table) => {
        table.boolean('isAdmin').notNullable().defaultTo(false).index();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasWorkflows = await knex.schema.hasTable('workflows');
  if (hasWorkflows) {
    const hasViewCount = await knex.schema.hasColumn('workflows', 'viewCount');
    if (hasViewCount) {
      await knex.schema.alterTable('workflows', (table) => {
        table.dropColumn('viewCount');
      });
    }
    const hasFavoriteCount = await knex.schema.hasColumn('workflows', 'favoriteCount');
    if (hasFavoriteCount) {
      await knex.schema.alterTable('workflows', (table) => {
        table.dropColumn('favoriteCount');
      });
    }
  }

  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasIsAdmin = await knex.schema.hasColumn('users', 'isAdmin');
    if (hasIsAdmin) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('isAdmin');
      });
    }
  }
}


