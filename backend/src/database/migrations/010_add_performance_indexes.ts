import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 为工作流表添加复合索引以优化查询性能
  await knex.schema.alterTable('workflows', (table) => {
    // 用于搜索和排序的复合索引
    table.index(['status', 'createdAt'], 'idx_workflows_status_created');
    table.index(['category', 'price'], 'idx_workflows_category_price');
    table.index(['isVip', 'isFree', 'rating'], 'idx_workflows_vip_free_rating');
    table.index(['authorId', 'status'], 'idx_workflows_author_status');
    
    // 用于全文搜索的索引
    table.index(['title'], 'idx_workflows_title');
    table.index(['tags'], 'idx_workflows_tags');
  });

  // 为订单表添加复合索引
  await knex.schema.alterTable('orders', (table) => {
    table.index(['userId', 'status', 'createdAt'], 'idx_orders_user_status_created');
    table.index(['status', 'updatedAt'], 'idx_orders_status_updated');
  });

  // 为订单项表添加索引
  await knex.schema.alterTable('order_items', (table) => {
    table.index(['workflowId', 'createdAt'], 'idx_order_items_workflow_created');
  });

  // 为支付表添加索引
  await knex.schema.alterTable('payments', (table) => {
    table.index(['userId', 'status'], 'idx_payments_user_status');
    table.index(['orderId', 'status'], 'idx_payments_order_status');
  });

  // 为购物车项表添加索引
  await knex.schema.alterTable('cart_items', (table) => {
    table.index(['userId', 'createdAt'], 'idx_cart_items_user_created');
  });

  // 为用户表添加查询优化索引
  await knex.schema.alterTable('users', (table) => {
    table.index(['isVip', 'vipExpiresAt'], 'idx_users_vip_expires');
    table.index(['createdAt'], 'idx_users_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  // 删除工作流表索引
  await knex.schema.alterTable('workflows', (table) => {
    table.dropIndex(['status', 'createdAt'], 'idx_workflows_status_created');
    table.dropIndex(['category', 'price'], 'idx_workflows_category_price');
    table.dropIndex(['isVip', 'isFree', 'rating'], 'idx_workflows_vip_free_rating');
    table.dropIndex(['authorId', 'status'], 'idx_workflows_author_status');
    table.dropIndex(['title'], 'idx_workflows_title');
    table.dropIndex(['tags'], 'idx_workflows_tags');
  });

  // 删除订单表索引
  await knex.schema.alterTable('orders', (table) => {
    table.dropIndex(['userId', 'status', 'createdAt'], 'idx_orders_user_status_created');
    table.dropIndex(['status', 'updatedAt'], 'idx_orders_status_updated');
  });

  // 删除订单项表索引
  await knex.schema.alterTable('order_items', (table) => {
    table.dropIndex(['workflowId', 'createdAt'], 'idx_order_items_workflow_created');
  });

  // 删除支付表索引
  await knex.schema.alterTable('payments', (table) => {
    table.dropIndex(['userId', 'status'], 'idx_payments_user_status');
    table.dropIndex(['orderId', 'status'], 'idx_payments_order_status');
  });

  // 删除购物车项表索引
  await knex.schema.alterTable('cart_items', (table) => {
    table.dropIndex(['userId', 'createdAt'], 'idx_cart_items_user_created');
  });

  // 删除用户表索引
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['isVip', 'vipExpiresAt'], 'idx_users_vip_expires');
    table.dropIndex(['createdAt'], 'idx_users_created');
  });
}
