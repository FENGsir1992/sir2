import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function MembershipPage() {
  const plans = [
    {
      name: "免费版",
      price: "¥0",
      period: "/月",
      features: [
        "3个工作流",
        "基础模板",
        "1GB存储空间",
        "社区支持"
      ],
      current: false,
      popular: false,
    },
    {
      name: "专业版",
      price: "¥99",
      period: "/月",
      features: [
        "无限工作流",
        "高级模板",
        "10GB存储空间",
        "优先支持",
        "团队协作",
        "高级分析"
      ],
      current: true,
      popular: true,
    },
    {
      name: "企业版",
      price: "¥299",
      period: "/月",
      features: [
        "无限工作流",
        "企业模板",
        "100GB存储空间",
        "专属客服",
        "高级团队协作",
        "企业级安全",
        "API访问",
        "自定义集成"
      ],
      current: false,
      popular: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">选择适合您的会员计划</h1>
        <p className="text-gray-600 text-lg">解锁更多功能，提升工作效率</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <Card 
            key={index} 
            className={`relative ${plan.popular ? 'border-2 border-primary scale-105' : 'border'}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Chip color="primary" size="sm">最受欢迎</Chip>
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <div className="w-full">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline justify-center mt-2">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardBody className="pt-2">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <Icon icon="solar:check-circle-bold" className="text-primary text-lg" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                color={plan.current ? "default" : "primary"}
                variant={plan.current ? "bordered" : "solid"}
                className="w-full"
                disabled={plan.current}
              >
                {plan.current ? "当前计划" : "选择计划"}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <h3 className="text-xl font-bold">常见问题</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">如何升级会员？</h4>
                <p className="text-gray-600 text-sm">选择您需要的计划，点击"选择计划"按钮即可完成升级。</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">可以随时取消订阅吗？</h4>
                <p className="text-gray-600 text-sm">是的，您可以随时在账户设置中取消订阅，取消后将在当前计费周期结束时生效。</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">支持哪些支付方式？</h4>
                <p className="text-gray-600 text-sm">我们支持支付宝、微信支付、银行卡等多种支付方式。</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
