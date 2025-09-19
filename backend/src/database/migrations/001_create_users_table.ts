import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('username').notNullable();
    table.string('email').unique().notNullable();
    table.string('passwordHash').notNullable();
    table.string('avatar');
    table.boolean('isVip').defaultTo(false);
    table.timestamp('vipExpiresAt');
    table.decimal('balance', 10, 2).defaultTo(0);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['email']);
    table.index(['username']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
