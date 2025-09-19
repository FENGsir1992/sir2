import React from "react";

type EditableSectionProps = {
  page: string; // e.g. home, membership, recharge
  section: string; // e.g. hero, features, footer
  index?: number;
  children: React.ReactNode;
};

export default function EditableSection({ page: _page, section: _section, index: _index, children, className }: EditableSectionProps & { className?: string }) {
  // const normalized = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Element ID generation for potential future use
  // const _id = ["page", normalized(_page), "section", normalized(_section), typeof _index === 'number' ? String(_index) : undefined]
  //   .filter(Boolean)
  //   .join(":");
  return (
    <div className={className}>
      {children}
    </div>
  );
}


