export interface ShopeeScrapp {
    storeId: string,
    dealId: string,
    item: string
}
export interface HTTPHeaders {
    [header: string]: string;
}
export interface ShopeeProductData {
    item: any; // Replace 'any' with the actual type definition
}