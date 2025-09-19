import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('workflow_reviews', (table) => {
    table.string('id').primary();
    table.string('userId').references('id').inTable('users').onDelete('CASCADE');
    table.string('workflowId').references('id').inTable('workflows').onDelete('CASCADE');
    table.integer('rating').notNullable(); // 1-5星评分
    table.text('comment').nullable(); // 评论内容
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['workflowId']);
    table.index(['rating']);
    table.index(['createdAt']);
    
    // 确保同一用户只能对同一工作流评价一次
    table.unique(['userId', 'workflowId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('workflow_reviews');
}

