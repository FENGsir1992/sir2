import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('payments', (table) => {
    table.string('id').primary();
    table.string('orderId').references('id').inTable('orders').onDelete('CASCADE');
    table.string('userId').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 10, 2).notNullable();
    table.enum('method', ['alipay', 'wechat', 'balance']).notNullable();
    table.enum('status', ['pending', 'processing', 'success', 'failed', 'cancelled']).defaultTo('pending');
    table.string('transactionId');
    table.text('failureReason');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['orderId']);
    table.index(['userId']);
    table.index(['status']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('payments');
}
