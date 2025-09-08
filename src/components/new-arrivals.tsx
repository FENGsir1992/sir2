import React from "react";
import { Card, CardBody, CardFooter, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export const NewArrivals: React.FC = () => {
  const products = [
    {
      id: 1,
      name: "Organic Cotton Dress",
      price: 89.99,
      image: "https://img.heroui.chat/image/fashion?w=600&h=800&u=41",
      rating: 4.5,
      reviews: 12,
    },
    {
      id: 2,
      name: "Recycled Nylon Backpack",
      price: 69.99,
      image: "https://img.heroui.chat/image/fashion?w=600&h=800&u=42",
      rating: 4.8,
      reviews: 24,
    },
    {
      id: 3,
      name: "Sustainable Sneakers",
      price: 79.99,
      image: "https://img.heroui.chat/image/shoes?w=600&h=800&u=43",
      rating: 4.7,
      reviews: 18,
    },
    {
      id: 4,
      name: "Hemp Jogger Pants",
      price: 59.99,
      image: "https://img.heroui.chat/image/clothing?w=600&h=800&u=44",
      rating: 4.6,
      reviews: 9,
    },
  ];

  return (
    <section className="py-16 container mx-auto px-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-bold mb-2">New Arrivals</h2>
          <p className="text-default-500">Our latest sustainable products</p>
        </div>
        <Button 
          variant="flat" 
          color="primary"
          radius="sm"
          endContent={<Icon icon="lucide:arrow-right" width={16} />}
        >
          View All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card 
            key={product.id} 
            isPressable 
            className="border border-divider"
            shadow="none"
          >
            <CardBody className="p-0 overflow-hidden">
              <div className="relative h-72 w-full overflow-hidden group">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 bg-success text-white text-xs font-medium px-2 py-1 rounded-sm">
                  NEW
                </span>
                <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button isIconOnly size="sm" color="primary" className="bg-white text-foreground" variant="flat" radius="full">
                    <Icon icon="lucide:heart" width={18} />
                  </Button>
                  <Button isIconOnly size="sm" color="primary" className="bg-white text-foreground" variant="flat" radius="full">
                    <Icon icon="lucide:eye" width={18} />
                  </Button>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex flex-col items-start px-4 py-3">
              <h3 className="font-medium text-foreground">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-semibold">${product.price}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 mb-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Icon 
                      key={i} 
                      icon="lucide:star" 
                      width={14} 
                      className={i < Math.floor(product.rating) ? "text-warning" : "text-default-300"}
                      fill={i < Math.floor(product.rating) ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className="text-default-500 text-xs">({product.reviews})</span>
              </div>
              <Button 
                color="primary" 
                radius="sm" 
                className="w-full"
                startContent={<Icon icon="lucide:shopping-cart" width={16} />}
              >
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};