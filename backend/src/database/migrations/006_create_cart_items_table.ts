import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('cart_items', (table) => {
    table.string('id').primary();
    table.string('userId').references('id').inTable('users').onDelete('CASCADE');
    table.string('workflowId').references('id').inTable('workflows').onDelete('CASCADE');
    table.integer('quantity').defaultTo(1);
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['workflowId']);
    table.unique(['userId', 'workflowId']); // 同一用户同一商品只能有一个购物车项
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('cart_items');
}
