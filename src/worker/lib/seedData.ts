// Korean Food Arena Seed Data
// This file contains the initial food data for seeding the database

export interface SeedFood {
  name: string
  imageUrl: string
  eloScore?: number
  totalVotes?: number
}

export const KOREAN_FOODS: SeedFood[] = [
  {
    name: 'Bibimbap',
    imageUrl: '/img/food/display/bibimbap.webp',
  },
  {
    name: 'Bulgogi',
    imageUrl: '/img/food/display/bulgogi.webp',
  },
  {
    name: 'Kimchi',
    imageUrl: '/img/food/display/kimchi.webp',
  },
  {
    name: 'Korean Fried Chicken',
    imageUrl: '/img/food/display/korean-fried-chicken.webp',
  },
  {
    name: 'Japchae',
    imageUrl: '/img/food/display/japchae.webp',
  },
  {
    name: 'Galbi',
    imageUrl: '/img/food/display/galbi.webp',
  },
  {
    name: 'Samgyeopsal',
    imageUrl: '/img/food/display/samgyeopsal.webp',
  },
  {
    name: 'Kimbap',
    imageUrl: '/img/food/display/kimbap.webp',
  },
  {
    name: 'Mandu',
    imageUrl: '/img/food/display/mandu.webp',
  },
  {
    name: 'Jeyuk Bokkeum',
    imageUrl: '/img/food/display/jeyuk-bokkeum.webp',
  },
  {
    name: 'Shin Ramyun',
    imageUrl: '/img/food/display/shin-ramyun.webp',
  },
  {
    name: 'Shin Ramyun Black',
    imageUrl: '/img/food/display/shin-ramyun-black.webp',
  },
  {
    name: 'Buldak Ramen',
    imageUrl: '/img/food/display/buldak-ramen.webp',
  },
  {
    name: 'Buldak Ramen Carbonara',
    imageUrl: '/img/food/display/buldak-ramen-carbonara.webp',
  },
  {
    name: 'Chapaguri',
    imageUrl: '/img/food/display/chapaguri.webp',
  },
  {
    name: 'Korean Corn Dog',
    imageUrl: '/img/food/display/korean-corn-dog.webp',
  },
  {
    name: 'Hotteok',
    imageUrl: '/img/food/display/hotteok.webp',
  },
  {
    name: 'Gim',
    imageUrl: '/img/food/display/gim.webp',
  },
  {
    name: 'Korean Banana Milk Coffee',
    imageUrl:
      '/img/food/display/korean-convenience-store-banana-milk-coffe.webp',
  },
]
