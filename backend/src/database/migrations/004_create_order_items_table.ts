import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('order_items', (table) => {
    table.string('id').primary();
    table.string('orderId').references('id').inTable('orders').onDelete('CASCADE');
    table.string('workflowId').references('id').inTable('workflows').onDelete('CASCADE');
    table.string('workflowTitle').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.integer('quantity').defaultTo(1);
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['orderId']);
    table.index(['workflowId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('order_items');
}
