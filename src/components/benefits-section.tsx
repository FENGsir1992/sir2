import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";

interface BenefitCardProps {
  icon: string;
  title: string;
  description: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon, title, description }) => {
  return (
    <Card className="border border-divider" shadow="none">
      <CardBody className="flex flex-col items-center text-center p-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon icon={icon} className="text-primary text-2xl" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-default-600">{description}</p>
      </CardBody>
    </Card>
  );
};

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: "lucide:truck",
      title: "Free Shipping",
      description: "Free shipping on all orders over $50"
    },
    {
      icon: "lucide:rotate-ccw",
      title: "Easy Returns",
      description: "30-day money back guarantee"
    },
    {
      icon: "lucide:shield-check",
      title: "Secure Payment",
      description: "Your payment information is safe with us"
    },
    {
      icon: "lucide:headphones",
      title: "24/7 Support",
      description: "Our customer service team is here to help"
    }
  ];

  return (
    <section className="py-16">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};