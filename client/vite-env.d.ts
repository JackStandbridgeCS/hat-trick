/// <reference types="vite/client" />

declare module "*.txt?raw" {
  const content: string;
  export default content;
}

declare module "*.json" {
  const value: {
    name: string;
    description: string;
    imgUrl: string;
  };
  export default value;
}
