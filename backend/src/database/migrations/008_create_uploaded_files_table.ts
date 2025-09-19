import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('uploaded_files', (table) => {
    table.string('id').primary();
    table.string('originalName').notNullable();
    table.string('filename').notNullable();
    table.string('mimetype').notNullable();
    table.integer('size').notNullable();
    table.string('path').notNullable();
    table.string('url').notNullable();
    table.string('userId').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['filename']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('uploaded_files');
}
