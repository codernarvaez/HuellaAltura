<script setup>
import { ref, computed } from 'vue'
import { 
  Coffee, 
  Sprout, 
  Droplet, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Info,
  ShieldCheck,
  ShoppingBag
} from 'lucide-vue-next'

// Reactive state for catalog (ready for FastAPI API integration)
const categories = ['Todos', 'Café Especial', 'Bio-Insumos', 'Agroforestal']
const activeCategory = ref('Todos')

const products = ref([
  {
    id: 'prod-001',
    code: 'MND-CAF-01',
    name: 'Café Mandango de Altura 1950',
    category: 'Café Especial',
    badge: 'Puntaje SCA: 88.5',
    price: 12.50,
    priceUnit: 'bolsa 250g',
    description: 'Café de especialidad cultivado a 1,950 msnm en las faldas del majestuoso Cerro Mandango. Proceso de secado artesanal en marquesinas solares con notas a panela, jazmín y chocolate amargo.',
    features: [
      'Origen: Vilcabamba / Loja',
      'Variedad: Typica & Bourbon',
      'Tueste: Medio Artesanal',
      'Trazabilidad GPS completa'
    ],
    icon: Coffee,
    accentColor: 'border-agrobamba-coffee/40 bg-agrobamba-coffee/5',
    inStock: true
  },
  {
    id: 'prod-002',
    code: 'BIO-FERT-02',
    name: 'Bio-Fertilizante Folicar Orgánico',
    category: 'Bio-Insumos',
    badge: '100% Bio-Tecnología',
    price: 34.00,
    priceUnit: 'Caneca 5 Litros',
    description: 'Bio-estimulante foliar agroecológico formulado a base de microorganismos de montaña, aminoácidos de fermentación limpia y bio-nutrientes enriquecidos para revitalizar cultivos.',
    features: [
      'Fortalece raíces y flora microbiota',
      'Aumenta resistencia a sequía y plagas',
      'Certificado Producción Limpia',
      'Apto para café, palto y cacao'
    ],
    icon: Sprout,
    accentColor: 'border-agrobamba-forest/40 bg-agrobamba-forest/5',
    inStock: true
  },
  {
    id: 'prod-003',
    code: 'HON-AGRO-03',
    name: 'Miel Pura Agroforestal Mandango',
    category: 'Agroforestal',
    badge: 'Floración Nativa',
    price: 9.80,
    priceUnit: 'Frasco 500g',
    description: 'Miel artesanal multi-floral recolectada de colmenas situadas dentro de nuestros agro-ecosistemas biodiversos en Loja. Libre de químicos y no centrifugada a alta temperatura.',
    features: [
      'Cosechada de flor de guayabo y café',
      'Propiedades antibacterianas naturales',
      'Envase de vidrio reciclable',
      'Sostenible con polinizadores andinos'
    ],
    icon: Droplet,
    accentColor: 'border-agrobamba-amber/40 bg-agrobamba-amber/5',
    inStock: true
  }
])

const selectedProductForModal = ref(null)

const filteredProducts = computed(() => {
  if (activeCategory.value === 'Todos') return products.value
  return products.value.filter(p => p.category === activeCategory.value)
})

const openProductModal = (product) => {
  selectedProductForModal.value = product
}

const closeModal = () => {
  selectedProductForModal.value = null
}
</script>

<template>
  <section id="productos" class="py-20 lg:py-28 bg-agrobamba-surface relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto space-y-4">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-agrobamba-sand border border-agrobamba-border text-agrobamba-coffee text-xs font-semibold uppercase tracking-wider">
          <Sprout class="w-3.5 h-3.5 text-agrobamba-amber" />
          <span>CATÁLOGO PRINCIPAL AGROBAMBA</span>
        </div>
        <h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-agrobamba-forest tracking-tight">
          Nuestros 3 Pilares Agroproductivos
        </h2>
        <p class="text-base sm:text-lg text-agrobamba-olive leading-relaxed font-sans">
          Productos nacidos de la biotecnología limpia y el conocimiento tradicional del sur andino. Listos para despacho nacional e internacional B2B/B2C.
        </p>

        <!-- Category Filters -->
        <div class="flex flex-wrap items-center justify-center gap-2 pt-4">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="activeCategory = cat"
            :class="[
              'px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
              activeCategory === cat
                ? 'bg-agrobamba-forest text-white shadow-agrobamba-sm'
                : 'bg-white border border-agrobamba-border text-agrobamba-olive hover:bg-agrobamba-sand'
            ]"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- 3 Products Grid -->
      <div class="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="bg-white rounded-2xl border border-agrobamba-border overflow-hidden shadow-agrobamba-sm hover:shadow-agrobamba-lg transition-all duration-300 flex flex-col justify-between group"
        >
          <!-- Card Header & Badge -->
          <div class="p-6 sm:p-7 space-y-4">
            
            <div class="flex items-center justify-between">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-agrobamba-forest border border-agrobamba-border shadow-sm group-hover:bg-agrobamba-forest group-hover:text-agrobamba-amber transition-colors">
                <component :is="product.icon" class="w-6 h-6" />
              </div>
              <span class="px-3 py-1 rounded-full bg-agrobamba-sand text-agrobamba-coffee-light font-mono text-xs font-semibold border border-agrobamba-border">
                {{ product.badge }}
              </span>
            </div>

            <div>
              <span class="text-[11px] uppercase tracking-wider font-mono font-bold text-agrobamba-olive">
                {{ product.code }} &bull; {{ product.category }}
              </span>
              <h3 class="font-serif text-2xl font-bold text-agrobamba-forest mt-1 group-hover:text-agrobamba-coffee transition-colors">
                {{ product.name }}
              </h3>
            </div>

            <p class="text-sm text-agrobamba-olive line-clamp-3 leading-relaxed font-sans">
              {{ product.description }}
            </p>

            <!-- Features list -->
            <ul class="space-y-2 pt-2 border-t border-agrobamba-border/60">
              <li 
                v-for="(feat, idx) in product.features" 
                :key="idx" 
                class="flex items-center gap-2 text-xs text-agrobamba-charcoal font-medium"
              >
                <CheckCircle2 class="w-4 h-4 text-agrobamba-emerald shrink-0" />
                <span>{{ feat }}</span>
              </li>
            </ul>

          </div>

          <!-- Card Footer & Price Actions -->
          <div class="p-6 bg-agrobamba-surface/60 border-t border-agrobamba-border flex items-center justify-between">
            <div>
              <span class="text-xs text-agrobamba-olive block font-mono">PRECIO BASE</span>
              <div class="flex items-baseline gap-1">
                <span class="font-serif text-2xl font-bold text-agrobamba-forest">${{ product.price.toFixed(2) }}</span>
                <span class="text-xs text-agrobamba-olive">/ {{ product.priceUnit }}</span>
              </div>
            </div>

            <button
              @click="openProductModal(product)"
              class="px-4 py-2.5 rounded-lg bg-agrobamba-forest text-agrobamba-surface text-xs font-semibold hover:bg-agrobamba-forest-light transition-all flex items-center gap-1.5 shadow-sm group-hover:shadow-agrobamba-sm"
            >
              <span>Detalles</span>
              <ArrowRight class="w-3.5 h-3.5 text-agrobamba-amber" />
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Product Detail Modal -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="selectedProductForModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-2xl border border-agrobamba-border max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
          
          <button 
            @click="closeModal"
            class="absolute top-4 right-4 p-2 rounded-full text-agrobamba-olive hover:bg-agrobamba-sand transition-colors"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-agrobamba-forest text-agrobamba-amber flex items-center justify-center">
              <component :is="selectedProductForModal.icon" class="w-6 h-6" />
            </div>
            <div>
              <span class="text-xs font-mono uppercase text-agrobamba-coffee-light font-bold">
                {{ selectedProductForModal.code }}
              </span>
              <h3 class="font-serif text-2xl font-bold text-agrobamba-forest">
                {{ selectedProductForModal.name }}
              </h3>
            </div>
          </div>

          <p class="text-sm text-agrobamba-olive leading-relaxed">
            {{ selectedProductForModal.description }}
          </p>

          <div class="bg-agrobamba-sand/50 p-4 rounded-xl border border-agrobamba-border space-y-2">
            <h4 class="text-xs font-bold uppercase text-agrobamba-forest tracking-wider">ESPECIFICACIONES DE ORIGEN</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div v-for="(feat, idx) in selectedProductForModal.features" :key="idx" class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-agrobamba-emerald" />
                <span class="text-agrobamba-charcoal font-medium">{{ feat }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div>
              <span class="text-xs text-agrobamba-olive block font-mono">PRECIO INDICATIVO</span>
              <span class="font-serif text-3xl font-bold text-agrobamba-forest">
                ${{ selectedProductForModal.price.toFixed(2) }}
              </span>
            </div>

            <div class="flex items-center gap-3">
              <button 
                @click="closeModal"
                class="px-4 py-2.5 rounded-lg border border-agrobamba-border text-agrobamba-olive text-sm font-semibold hover:bg-agrobamba-sand"
              >
                Cerrar
              </button>
              <a
                href="#marketplace"
                @click="closeModal"
                class="px-5 py-2.5 rounded-lg bg-agrobamba-forest text-white text-sm font-semibold hover:bg-agrobamba-forest-light flex items-center gap-2 shadow-md"
              >
                <ShoppingBag class="w-4 h-4 text-agrobamba-amber" />
                <span>Solicitar Pedido</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </transition>
  </section>
</template>
