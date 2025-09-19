import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_favorites', (table) => {
    table.string('id').primary();
    table.string('userId').references('id').inTable('users').onDelete('CASCADE');
    table.string('workflowId').references('id').inTable('workflows').onDelete('CASCADE');
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['workflowId']);
    table.index(['userId', 'workflowId']);
    
    // 确保同一用户不能重复收藏同一工作流
    table.unique(['userId', 'workflowId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_favorites');
}

