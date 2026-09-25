<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  Sprout, 
  Coffee, 
  ShieldCheck, 
  Store, 
  Leaf, 
  Menu, 
  X, 
  ChevronRight,
  Globe
} from 'lucide-vue-next'

// Reactive States (ready for FastAPI auth/session or dynamic nav)
const mobileMenuOpen = ref(false)
const isScrolled = ref(false)
const activeSection = ref('inicio')
const selectedLanguage = ref('ES')

const navItems = [
  { name: 'Ecosistema', href: '#ecosistema', icon: Sprout },
  { name: 'Productos', href: '#productos', icon: Leaf },
  { name: 'Café Mandango', href: '#mandango', icon: Coffee },
  { name: 'Huella de Altura', href: '#trazabilidad', icon: ShieldCheck },
  { name: 'Marketplace B2B/B2C', href: '#marketplace', icon: Store },
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const selectNav = (sectionId) => {
  activeSection.value = sectionId
  mobileMenuOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header 
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled 
        ? 'bg-agrobamba-surface/90 backdrop-blur-md shadow-agrobamba-sm py-3 border-b border-agrobamba-border' 
        : 'bg-transparent py-5 border-b border-agrobamba-border/30'
    ]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between">
        
        <!-- Brand Logo -->
        <a href="#inicio" @click="selectNav('inicio')" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-lg bg-agrobamba-forest flex items-center justify-center text-agrobamba-amber transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-md">
            <Sprout class="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span class="font-serif text-xl sm:text-2xl font-bold tracking-tight text-agrobamba-forest block leading-none">
              AGROBAMBA
            </span>
            <span class="text-[10px] tracking-widest font-semibold uppercase text-agrobamba-coffee-light block mt-1">
              CIA. LTDA. &bull; PRECISION AGRI-TECH
            </span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="hidden lg:flex items-center gap-1 xl:gap-2">
          <a
            v-for="item in navItems"
            :key="item.name"
            :href="item.href"
            @click="selectNav(item.href.replace('#', ''))"
            class="px-3 py-2 rounded-md text-sm font-medium text-agrobamba-charcoal hover:text-agrobamba-forest hover:bg-agrobamba-sand/60 transition-all duration-200 flex items-center gap-1.5"
          >
            <component :is="item.icon" class="w-4 h-4 text-agrobamba-amber" />
            <span>{{ item.name }}</span>
          </a>
        </nav>

        <!-- Right Action Controls -->
        <div class="hidden sm:flex items-center gap-3">
          <!-- Language Selector Switch -->
          <button 
            @click="selectedLanguage = selectedLanguage === 'ES' ? 'EN' : 'ES'" 
            class="px-2.5 py-1.5 rounded-md border border-agrobamba-border text-xs font-semibold text-agrobamba-olive hover:border-agrobamba-forest transition-colors flex items-center gap-1 bg-white/50"
            title="Cambiar idioma"
          >
            <Globe class="w-3.5 h-3.5 text-agrobamba-coffee-light" />
            <span>{{ selectedLanguage }}</span>
          </button>

          <!-- B2B Contact CTA Button -->
          <a 
            href="#contacto"
            class="px-4 py-2 rounded-lg bg-agrobamba-forest text-agrobamba-surface hover:bg-agrobamba-forest-light transition-all duration-200 text-sm font-semibold shadow-agrobamba-sm hover:shadow-agrobamba-md flex items-center gap-1.5 group border border-agrobamba-amber/30"
          >
            <span>Contacto B2B</span>
            <ChevronRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-agrobamba-amber" />
          </a>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <div class="flex items-center gap-2 lg:hidden">
          <button
            @click="toggleMobileMenu"
            class="p-2 rounded-lg text-agrobamba-forest hover:bg-agrobamba-sand focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <Menu v-if="!mobileMenuOpen" class="w-6 h-6" />
            <X v-else class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div 
        v-if="mobileMenuOpen" 
        class="lg:hidden bg-agrobamba-surface border-b border-agrobamba-border px-4 pt-3 pb-6 shadow-xl"
      >
        <div class="flex flex-col space-y-2">
          <a
            v-for="item in navItems"
            :key="item.name"
            :href="item.href"
            @click="selectNav(item.href.replace('#', ''))"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-agrobamba-charcoal hover:bg-agrobamba-sand hover:text-agrobamba-forest transition-colors"
          >
            <component :is="item.icon" class="w-5 h-5 text-agrobamba-amber" />
            <span>{{ item.name }}</span>
          </a>

          <div class="pt-4 mt-2 border-t border-agrobamba-border/60 flex flex-col gap-3">
            <a 
              href="#contacto"
              @click="mobileMenuOpen = false"
              class="w-full text-center py-3 rounded-lg bg-agrobamba-forest text-agrobamba-surface font-semibold text-sm shadow-md flex items-center justify-center gap-2"
            >
              <span>Solicitar Cotización B2B</span>
              <ChevronRight class="w-4 h-4 text-agrobamba-amber" />
            </a>
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>
