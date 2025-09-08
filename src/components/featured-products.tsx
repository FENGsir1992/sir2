import React from "react";
import { Card, CardBody, CardFooter, Button, Image, Badge } from "@heroui/react";
import { Icon } from "@iconify/react";

interface ProductCardProps {
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  isNew?: boolean;
  isSale?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  name, 
  price, 
  oldPrice, 
  image, 
  rating, 
  isNew = false,
  isSale = false
}) => {
  return (
    <Card className="border border-divider" shadow="none">
      <CardBody className="p-0 overflow-hidden">
        <div className="relative group">
          <Image
            removeWrapper
            alt={name}
            className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
            src={image}
          />
          {isNew && (
            <Badge 
              content="NEW" 
              color="primary" 
              className="absolute top-3 left-3"
            />
          )}
          {isSale && (
            <Badge 
              content="SALE" 
              color="danger" 
              className="absolute top-3 left-3"
            />
          )}
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button isIconOnly size="sm" radius="full" variant="flat" className="bg-white/90">
              <Icon icon="lucide:heart" size={18} />
            </Button>
            <Button isIconOnly size="sm" radius="full" variant="flat" className="bg-white/90">
              <Icon icon="lucide:eye" size={18} />
            </Button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button 
              color="primary" 
              variant="flat" 
              radius="full" 
              className="font-medium"
              startContent={<Icon icon="lucide:shopping-cart" size={18} />}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </CardBody>
      <CardFooter className="flex flex-col items-start text-left">
        <div className="flex items-center mb-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Icon 
                key={i} 
                icon="lucide:star" 
                className={i < rating ? "text-warning" : "text-default-300"} 
                size={14} 
              />
            ))}
          </div>
          <span className="text-default-500 text-xs ml-1">({Math.floor(Math.random() * 100) + 10})</span>
        </div>
        <h3 className="font-medium text-foreground">{name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold">${price.toFixed(2)}</span>
          {oldPrice && (
            <span className="text-default-400 text-sm line-through">${oldPrice.toFixed(2)}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export const FeaturedProducts: React.FC = () => {
  const products = [
    { name: "Modern Lounge Chair", price: 249.99, oldPrice: 299.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=101", rating: 4, isSale: true },
    { name: "Wooden Coffee Table", price: 189.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=102", rating: 5, isNew: true },
    { name: "Minimalist Desk Lamp", price: 59.99, oldPrice: 79.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=103", rating: 4, isSale: true },
    { name: "Ergonomic Office Chair", price: 299.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=104", rating: 5 },
    { name: "Scandinavian Bookshelf", price: 349.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=105", rating: 4, isNew: true },
    { name: "Velvet Accent Sofa", price: 599.99, oldPrice: 699.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=106", rating: 5, isSale: true },
    { name: "Marble Dining Table", price: 799.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=107", rating: 4 },
    { name: "Rattan Bedside Table", price: 129.99, image: "https://img.heroui.chat/image/furniture?w=400&h=400&u=108", rating: 4, isNew: true }
  ];

  return (
    <section className="py-16">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center mb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-default-600 max-w-2xl">
            Discover our handpicked selection of the finest furniture pieces for your home
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <ProductCard
              key={index}
              name={product.name}
              price={product.price}
              oldPrice={product.oldPrice}
              image={product.image}
              rating={product.rating}
              isNew={product.isNew}
              isSale={product.isSale}
            />
          ))}
        </div>
        
        <div className="flex justify-center mt-12">
          <Button 
            color="primary" 
            variant="bordered" 
            size="lg"
            className="font-medium"
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};