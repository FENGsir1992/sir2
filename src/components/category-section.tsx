import React from "react";
import { Card, CardBody, Image } from "@heroui/react";
import { Icon } from "@iconify/react";

interface CategoryCardProps {
  title: string;
  icon: string;
  image: string;
  count: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, icon, image, count }) => {
  return (
    <Card 
      isPressable 
      className="overflow-hidden border border-divider"
      shadow="none"
      isHoverable
    >
      <CardBody className="p-0 overflow-hidden">
        <div className="relative group">
          <Image
            removeWrapper
            alt={title}
            className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
            src={image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon={icon} className="text-xl" />
                <h3 className="text-lg font-medium">{title}</h3>
              </div>
              <span className="text-sm opacity-80">{count} items</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export const CategorySection: React.FC = () => {
  const categories = [
    { title: "Living Room", icon: "lucide:sofa", image: "https://img.heroui.chat/image/furniture?w=400&h=300&u=11", count: 124 },
    { title: "Bedroom", icon: "lucide:bed", image: "https://img.heroui.chat/image/furniture?w=400&h=300&u=22", count: 98 },
    { title: "Kitchen", icon: "lucide:utensils", image: "https://img.heroui.chat/image/furniture?w=400&h=300&u=33", count: 156 },
    { title: "Office", icon: "lucide:briefcase", image: "https://img.heroui.chat/image/furniture?w=400&h=300&u=44", count: 87 }
  ];

  return (
    <section className="py-16 bg-content1">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center mb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Shop By Category</h2>
          <p className="text-default-600 max-w-2xl">
            Browse our wide selection of furniture categories and find exactly what you need for your home
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <CategoryCard
              key={index}
              title={category.title}
              icon={category.icon}
              image={category.image}
              count={category.count}
            />
          ))}
        </div>
      </div>
    </section>
  );
};