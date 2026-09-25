<script setup>
import { ref, reactive, computed } from 'vue'
import { 
  Coffee, 
  MapPin, 
  Flame, 
  Mountain, 
  Award, 
  Plus, 
  Minus, 
  Check, 
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-vue-next'

// Reactive state for bag selection & calculation
const selectedSize = ref('250g')
const selectedGrind = ref('En Grano')
const quantity = ref(1)
const orderSubmitted = ref(false)

const sizes = [
  { id: '250g', name: 'Bolsa 250g Elegante', price: 12.50, unitWeight: '250g' },
  { id: '1kg', name: 'Bolsa 1kg Premium Kraft', price: 42.00, unitWeight: '1000g' },
]

const grindTypes = [
  'En Grano (Recomendado)',
  'Molienda Fina (Espresso)',
  'Molienda Media (Filtrado / V60 / Prensa)'
]

const currentPrice = computed(() => {
  const match = sizes.find(s => s.id === selectedSize.value)
  return match ? match.price : 12.50
})

const totalPrice = computed(() => {
  return (currentPrice.value * quantity.value).toFixed(2)
})

const incrementQty = () => {
  quantity.value++
}

const decrementQty = () => {
  if (quantity.value > 1) quantity.value--
}

// Reactive order state ready for FastAPI payload
const orderPayload = reactive({
  product: 'Café Mandango 1950',
  size: selectedSize,
  grind: selectedGrind,
  quantity: quantity,
  totalPrice: totalPrice
})

const handleOrderSubmit = () => {
  orderSubmitted.value = true
  setTimeout(() => {
    orderSubmitted.value = false
  }, 4000)
}
</script>

<template>
  <section id="mandango" class="py-20 lg:py-32 bg-agrobamba-forest text-agrobamba-surface relative overflow-hidden">
    
    <!-- Ambient Lighting Accents -->
    <div class="absolute -top-40 -right-40 w-[500px] h-[500px] bg-agrobamba-coffee/30 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-agrobamba-amber/15 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        <!-- Storytelling Column -->
        <div class="lg:col-span-6 space-y-6">
          
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agrobamba-coffee/40 border border-agrobamba-amber/30 text-agrobamba-amber text-xs font-semibold uppercase tracking-wider">
            <Coffee class="w-3.5 h-3.5 text-agrobamba-amber" />
            <span>CAFÉ DE ESPECIALIDAD EDICIÓN LIMITADA</span>
          </div>

          <h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white">
            Café Mandango de Altura: El Alma mística de Vilcabamba
          </h2>

          <p class="text-agrobamba-surface/85 text-base sm:text-lg leading-relaxed font-sans">
            A 1,950 metros sobre el nivel del mar, bajo la mística silueta del Cerro Mandango en Loja, cultivamos este grano bajo dosel de bosque nativo. La combinación de brisas interandinas, suelo volcánico fértil y secado solar lento otorga una taza limpia, dulce y fragante.
          </p>

          <!-- Sensory Profile Cards -->
          <div class="grid grid-cols-3 gap-3 pt-2">
            <div class="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-center">
              <span class="text-xs text-agrobamba-amber font-mono block uppercase">ACIDEZ</span>
              <span class="font-serif text-lg font-bold text-white mt-1 block">Brillante / Cítrica</span>
            </div>
            <div class="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-center">
              <span class="text-xs text-agrobamba-amber font-mono block uppercase">CUERPO</span>
              <span class="font-serif text-lg font-bold text-white mt-1 block">Sedoso & Denso</span>
            </div>
            <div class="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-center">
              <span class="text-xs text-agrobamba-amber font-mono block uppercase">NOTAS</span>
              <span class="font-serif text-lg font-bold text-white mt-1 block">Panela, Jazmín</span>
            </div>
          </div>

          <!-- Attributes Checklist -->
          <div class="space-y-3 pt-4 border-t border-white/10">
            <div class="flex items-center gap-3 text-sm text-agrobamba-surface/90">
              <ShieldCheck class="w-5 h-5 text-agrobamba-amber shrink-0" />
              <span>Cosecha manual grano a grano en madurez óptima.</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-agrobamba-surface/90">
              <Award class="w-5 h-5 text-agrobamba-amber shrink-0" />
              <span>Micro-lote calificado por catadores Q-Grader con 88.5 Puntos SCA.</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-agrobamba-surface/90">
              <Mountain class="w-5 h-5 text-agrobamba-amber shrink-0" />
              <span>Secado lento en marquesinas solares andinas.</span>
            </div>
          </div>

        </div>

        <!-- Interactive Direct Order & Bag Configurator -->
        <div class="lg:col-span-6">
          <div class="bg-agrobamba-surface text-agrobamba-charcoal rounded-2xl p-6 sm:p-8 border border-agrobamba-border shadow-2xl space-y-6">
            
            <div class="flex items-center justify-between border-b border-agrobamba-border pb-4">
              <div>
                <span class="text-xs font-mono uppercase text-agrobamba-coffee font-bold">COMPRA DIRECTA DE ORIGEN</span>
                <h3 class="font-serif text-2xl font-bold text-agrobamba-forest mt-0.5">Configura tu Pedido</h3>
              </div>
              <div class="w-10 h-10 rounded-full bg-agrobamba-amber/20 border border-agrobamba-amber flex items-center justify-center text-agrobamba-amber-dark">
                <Coffee class="w-5 h-5" />
              </div>
            </div>

            <!-- Size Selector -->
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase text-agrobamba-olive tracking-wider block">
                1. Selecciona la Presentación:
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="size in sizes"
                  :key="size.id"
                  @click="selectedSize = size.id"
                  :class="[
                    'p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between',
                    selectedSize === size.id
                      ? 'border-agrobamba-forest bg-agrobamba-sand/70 ring-2 ring-agrobamba-amber/30'
                      : 'border-agrobamba-border bg-white hover:bg-agrobamba-surface'
                  ]"
                >
                  <span class="text-xs font-bold text-agrobamba-forest">{{ size.name }}</span>
                  <span class="font-serif text-lg font-bold text-agrobamba-coffee mt-2">${{ size.price.toFixed(2) }}</span>
                </button>
              </div>
            </div>

            <!-- Grind Selector -->
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase text-agrobamba-olive tracking-wider block">
                2. Tipo de Molienda:
              </label>
              <select
                v-model="selectedGrind"
                class="w-full px-4 py-3 rounded-xl bg-white border border-agrobamba-border text-sm font-semibold text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest focus:ring-2 focus:ring-agrobamba-amber/20"
              >
                <option v-for="g in grindTypes" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>

            <!-- Quantity & Price Summary -->
            <div class="flex items-center justify-between p-4 bg-agrobamba-sand/50 rounded-xl border border-agrobamba-border">
              <div>
                <span class="text-xs text-agrobamba-olive block font-mono">CANTIDAD DE BOLSAS</span>
                <div class="flex items-center gap-3 mt-1">
                  <button 
                    @click="decrementQty"
                    class="w-8 h-8 rounded-lg bg-white border border-agrobamba-border flex items-center justify-center text-agrobamba-forest font-bold hover:bg-agrobamba-sand"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <span class="font-mono text-lg font-bold text-agrobamba-forest w-6 text-center">{{ quantity }}</span>
                  <button 
                    @click="incrementQty"
                    class="w-8 h-8 rounded-lg bg-white border border-agrobamba-border flex items-center justify-center text-agrobamba-forest font-bold hover:bg-agrobamba-sand"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="text-right">
                <span class="text-xs text-agrobamba-olive block font-mono">TOTAL ESTIMADO</span>
                <span class="font-serif text-3xl font-bold text-agrobamba-forest">${{ totalPrice }}</span>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              @click="handleOrderSubmit"
              class="w-full py-4 rounded-xl bg-agrobamba-coffee hover:bg-agrobamba-coffee-light text-white font-semibold text-base transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              <ShoppingBag class="w-5 h-5 text-agrobamba-amber group-hover:scale-110 transition-transform" />
              <span>Añadir al Pedido Directo</span>
            </button>

            <!-- Success Alert -->
            <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
              <div v-if="orderSubmitted" class="p-4 rounded-xl bg-agrobamba-emerald/15 border border-agrobamba-emerald/30 text-agrobamba-emerald text-xs font-semibold flex items-center gap-2">
                <Check class="w-5 h-5 text-agrobamba-emerald shrink-0" />
                <span>¡Pedido añadido! Listo para sincronizar con la orden FastAPI.</span>
              </div>
            </transition>

          </div>
        </div>

      </div>

    </div>
  </section>
</template>
