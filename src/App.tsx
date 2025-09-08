import React from "react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button, Input, Badge, Card, CardBody, CardFooter, Image } from "@heroui/react";
import { Icon } from "@iconify/react";
import { HeroSection } from "./components/hero-section";
import { CategorySection } from "./components/category-section";
import { FeaturedProducts } from "./components/featured-products";
import { PromotionSection } from "./components/promotion-section";
import { BenefitsSection } from "./components/benefits-section";
import { Footer } from "./components/footer";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navbar maxWidth="xl" className="border-b border-divider">
        <NavbarBrand>
          <Link href="#" className="font-bold text-inherit flex items-center">
            <Icon icon="lucide:leaf" className="text-primary text-2xl mr-2" />
            <p className="font-bold text-xl">ECOMUS</p>
          </Link>
        </NavbarBrand>
        
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Link color="foreground" href="#" className="text-sm font-medium">
              Home
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#" className="text-sm font-medium">
              Shop
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#" className="text-sm font-medium">
              Products
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#" className="text-sm font-medium">
              Categories
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#" className="text-sm font-medium">
              Blog
            </Link>
          </NavbarItem>
        </NavbarContent>
        
        <NavbarContent justify="end">
          <NavbarItem className="hidden sm:flex">
            <Input
              classNames={{
                base: "max-w-full sm:max-w-[10rem] h-10",
                mainWrapper: "h-full",
                input: "text-small",
                inputWrapper: "h-full font-normal text-default-500 bg-default-100",
              }}
              placeholder="Search..."
              size="sm"
              startContent={<Icon icon="lucide:search" size={18} />}
              type="search"
            />
          </NavbarItem>
          <NavbarItem>
            <Button isIconOnly variant="light" radius="full">
              <Icon icon="lucide:user" className="text-default-500" size={20} />
            </Button>
          </NavbarItem>
          <NavbarItem>
            <Badge content="3" color="primary" size="sm">
              <Button isIconOnly variant="light" radius="full">
                <Icon icon="lucide:shopping-bag" className="text-default-500" size={20} />
              </Button>
            </Badge>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <main>
        <HeroSection />
        <CategorySection />
        <FeaturedProducts />
        <PromotionSection />
        <BenefitsSection />
      </main>

      <Footer />
    </div>
  );
}