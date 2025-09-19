import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('orders', (table) => {
    table.string('id').primary();
    table.string('userId').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded']).defaultTo('pending');
    table.decimal('totalAmount', 10, 2).notNullable();
    table.text('shippingAddress');
    table.string('trackingNumber');
    table.string('paymentMethod');
    table.string('paymentId');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['status']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('orders');
}
