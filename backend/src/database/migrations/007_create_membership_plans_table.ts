import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('membership_plans', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.integer('duration').notNullable(); // 天数
    table.json('features'); // 存储为JSON数组
    table.boolean('isActive').defaultTo(true);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['isActive']);
    table.index(['price']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('membership_plans');
}
