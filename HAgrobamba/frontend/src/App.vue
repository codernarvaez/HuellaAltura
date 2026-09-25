<script setup>
import TheNavbar from './components/TheNavbar.vue'
import HeroSection from './components/HeroSection.vue'
import ProductsGridSection from './components/ProductsGridSection.vue'
import CafeMandangoSection from './components/CafeMandangoSection.vue'
import HuellaAlturaSection from './components/HuellaAlturaSection.vue'
import MarketplaceSection from './components/MarketplaceSection.vue'
import SostenibilidadFooter from './components/SostenibilidadFooter.vue'
</script>

<template>
  <div class="min-h-screen bg-agrobamba-surface font-sans antialiased text-agrobamba-charcoal selection:bg-agrobamba-amber-light selection:text-agrobamba-forest-dark">
    <!-- Fixed Navigation Header -->
    <TheNavbar />

    <!-- Main Content Flow -->
    <main>
      <!-- Hero Section -->
      <HeroSection />

      <!-- Section Divider Decorative Bar -->
      <div class="h-1 bg-gradient-to-r from-agrobamba-forest via-agrobamba-amber to-agrobamba-coffee opacity-30"></div>

      <!-- 3 Products Grid Section (Ecosistema Productivo) -->
      <ProductsGridSection />

      <!-- Café Mandango Storytelling & Compra Section -->
      <CafeMandangoSection />

      <!-- Huella de Altura Portal de Trazabilidad Section -->
      <HuellaAlturaSection />

      <!-- Marketplace B2B & B2C Commercial Section -->
      <MarketplaceSection />
    </main>

    <!-- Footer & Sustainability Section -->
    <SostenibilidadFooter />
  </div>
</template>

<style>
/* Smooth Scrolling and Custom Selection Colors */
html {
  scroll-behavior: smooth;
}
</style>
