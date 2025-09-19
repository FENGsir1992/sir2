import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('workflows', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('author').notNullable();
    table.string('authorId').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('price', 10, 2).defaultTo(0);
    table.boolean('isVip').defaultTo(false);
    table.boolean('isFree').defaultTo(false);
    table.string('cover');
    table.json('tags'); // 存储为JSON数组
    table.integer('workflowCount').defaultTo(1);
    table.integer('downloadCount').defaultTo(0);
    table.decimal('rating', 3, 2).defaultTo(0);
    table.integer('ratingCount').defaultTo(0);
    table.text('content'); // JSON格式的工作流内容
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['authorId']);
    table.index(['price']);
    table.index(['isVip']);
    table.index(['isFree']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('workflows');
}
