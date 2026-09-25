<script setup>
import { ref, reactive } from 'vue'
import { 
  ShieldCheck, 
  MapPin, 
  Mountain, 
  Award, 
  ArrowRight, 
  Search,
  Sparkles,
  BarChart3,
  Coffee
} from 'lucide-vue-next'

// Reactive state for telemetry stats (ready for FastAPI GET /api/v1/telemetry/summary)
const heroStats = reactive([
  { label: 'Altitud Promedio', value: '1,950 msnm', icon: Mountain, detail: 'Microclima Mandango - Loja' },
  { label: 'Trazabilidad EUDR', value: '100% Verificado', icon: ShieldCheck, detail: 'Certificación Satelital' },
  { label: 'Calidad SCA', value: '88.5 Pts', icon: Award, detail: 'Especialidad Café de Altura' },
  { label: 'Nodos IoT Activos', value: '42 Sensores', icon: BarChart3, detail: 'Monitoreo NPK & Humedad' },
])

const quickLoteSearch = ref('')
const searchMessage = ref('')

const handleQuickSearch = () => {
  if (!quickLoteSearch.value.trim()) {
    searchMessage.value = 'Ingrese un código de lote válido (ej. MND-2026-08)'
    return
  }
  searchMessage.value = `Consultando nodo de trazabilidad para ${quickLoteSearch.value.toUpperCase()}...`
  setTimeout(() => {
    const targetElement = document.getElementById('trazabilidad')
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' })
    }
  }, 400)
}
</script>

<template>
  <section id="inicio" class="relative pt-28 pb-20 lg:pt-36 lg:pb-32 overflow-hidden bg-gradient-to-b from-agrobamba-surface-canvas via-agrobamba-surface to-agrobamba-sand/40">
    
    <!-- Organic Background Accents -->
    <div class="absolute top-1/4 -left-20 w-96 h-96 bg-agrobamba-forest/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-10 -right-20 w-96 h-96 bg-agrobamba-amber/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        
        <!-- Left Hero Copy -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Editorial Pill Tag -->
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agrobamba-sand border border-agrobamba-border text-agrobamba-forest text-xs font-semibold tracking-wide shadow-sm">
            <Sparkles class="w-3.5 h-3.5 text-agrobamba-amber" />
            <span>BIOTECNOLOGÍA Y EXCELENCIA AGROFORESTAL</span>
          </div>

          <!-- Main Editorial Heading -->
          <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-agrobamba-forest leading-[1.12] tracking-tight">
            Ingeniería Agrícola de Precisión & 
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-agrobamba-coffee-light via-agrobamba-coffee to-agrobamba-amber">
              Café de Origen Mandango
            </span>
          </h1>

          <!-- Body Description -->
          <p class="text-base sm:text-lg text-agrobamba-olive leading-relaxed max-w-2xl font-sans">
            Impulsamos la sostenibilidad del sur del Ecuador. Combinamos bio-insumos de última generación, la producción artesanal del afamado <strong>Café Mandango</strong> de altura y el portal de trazabilidad <strong>Huella de Altura</strong> con soporte de imágenes satelitales y cumplimiento EUDR.
          </p>

          <!-- Interactive Lote Search Input (Quick Action) -->
          <div class="p-2 sm:p-3 bg-white rounded-xl border border-agrobamba-border shadow-agrobamba-md max-w-xl">
            <form @submit.prevent="handleQuickSearch" class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-grow flex items-center">
                <Search class="w-5 h-5 text-agrobamba-olive/70 absolute left-3" />
                <input
                  v-model="quickLoteSearch"
                  type="text"
                  placeholder="Código Lote / Trazabilidad (ej. MND-2026)"
                  class="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-agrobamba-surface border border-agrobamba-border/80 focus:border-agrobamba-forest focus:ring-2 focus:ring-agrobamba-amber/20 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                class="px-5 py-2.5 rounded-lg bg-agrobamba-forest hover:bg-agrobamba-forest-light text-agrobamba-surface font-semibold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm group"
              >
                <span>Verificar Lote</span>
                <ArrowRight class="w-4 h-4 text-agrobamba-amber group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            <p v-if="searchMessage" class="text-xs text-agrobamba-emerald font-medium mt-2 pl-2">
              {{ searchMessage }}
            </p>
          </div>

          <!-- CTAs -->
          <div class="flex flex-wrap items-center gap-4 pt-2">
            <a 
              href="#mandango"
              class="px-6 py-3.5 rounded-xl bg-agrobamba-coffee text-white font-semibold text-sm hover:bg-agrobamba-coffee-light transition-all shadow-agrobamba-sm flex items-center gap-2 group"
            >
              <Coffee class="w-4 h-4 text-agrobamba-amber" />
              <span>Explorar Café Mandango</span>
            </a>
            
            <a 
              href="#ecosistema"
              class="px-6 py-3.5 rounded-xl bg-white border border-agrobamba-border text-agrobamba-forest hover:bg-agrobamba-sand font-semibold text-sm transition-all flex items-center gap-2"
            >
              <span>Conocer Ecosistema B2B</span>
            </a>
          </div>

        </div>

        <!-- Right Hero Visual Card -->
        <div class="lg:col-span-5">
          <div class="relative mx-auto max-w-md lg:max-w-none">
            
            <!-- Hero Frame Container -->
            <div class="relative rounded-2xl bg-gradient-to-br from-agrobamba-forest-dark via-agrobamba-forest to-agrobamba-coffee p-1 shadow-agrobamba-lg overflow-hidden group">
              
              <!-- Subtle Mesh Overlay -->
              <div class="bg-agrobamba-forest/90 rounded-[14px] p-6 sm:p-8 text-white relative z-10 space-y-6">
                
                <div class="flex items-center justify-between border-b border-white/10 pb-4">
                  <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full bg-agrobamba-amber animate-pulse"></span>
                    <span class="text-xs font-mono tracking-wider uppercase text-agrobamba-amber-light">TELEMETRÍA EN VIVO</span>
                  </div>
                  <span class="text-xs text-white/70 font-mono">LOJA &bull; ECUADOR</span>
                </div>

                <!-- Featured Highlight Bag Graphic Card -->
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/15 space-y-4">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-[11px] uppercase tracking-widest text-agrobamba-amber font-bold">CAFÉ DE ALTURA ESPECIAL</span>
                      <h3 class="font-serif text-2xl font-bold text-white mt-0.5">Café Mandango 1950</h3>
                      <p class="text-xs text-white/80 mt-1 font-sans">Cultivado a las faldas del Cerro Mandango, Vilcabamba.</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-agrobamba-amber/20 border border-agrobamba-amber/40 text-agrobamba-amber text-xs font-bold font-mono">
                      88.5 SCA
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div class="bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <span class="text-white/60 block text-[10px]">TUESTE</span>
                      <span class="font-semibold text-white">Medio Artesanal</span>
                    </div>
                    <div class="bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <span class="text-white/60 block text-[10px]">NOTAS</span>
                      <span class="font-semibold text-agrobamba-amber-light">Panela, Jazmín, Cacao</span>
                    </div>
                  </div>
                </div>

                <!-- Live Geo Metrics Pill -->
                <div class="flex items-center justify-between bg-agrobamba-sand/10 p-3 rounded-xl border border-white/10 text-xs">
                  <div class="flex items-center gap-2">
                    <MapPin class="w-4 h-4 text-agrobamba-amber" />
                    <span>Valle de Vilcabamba & Mandango</span>
                  </div>
                  <span class="font-mono text-agrobamba-emerald bg-agrobamba-emerald/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                    100% Orgánico
                  </span>
                </div>

              </div>
            </div>

            <!-- Floating Badge Card -->
            <div class="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl border border-agrobamba-border shadow-agrobamba-md flex items-center gap-3.5 z-20 max-w-xs">
              <div class="w-10 h-10 rounded-lg bg-agrobamba-emerald/15 flex items-center justify-center text-agrobamba-emerald shrink-0">
                <ShieldCheck class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-agrobamba-charcoal">EUDR Deforestation-Free</p>
                <p class="text-[11px] text-agrobamba-olive">Apto para exportación a la Unión Europea.</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Telemetry Stats Cards Grid -->
      <div class="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div
          v-for="stat in heroStats"
          :key="stat.label"
          class="p-5 rounded-xl bg-white/80 backdrop-blur-sm border border-agrobamba-border shadow-agrobamba-sm hover:shadow-agrobamba-md hover:border-agrobamba-forest/30 transition-all duration-300 group"
        >
          <div class="flex items-center justify-between mb-3">
            <component :is="stat.icon" class="w-6 h-6 text-agrobamba-amber group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-mono uppercase text-agrobamba-olive bg-agrobamba-sand px-2 py-0.5 rounded">
              DATO VERIFICADO
            </span>
          </div>
          <p class="font-serif text-2xl font-bold text-agrobamba-forest tracking-tight">{{ stat.value }}</p>
          <p class="text-xs font-semibold text-agrobamba-charcoal mt-1">{{ stat.label }}</p>
          <p class="text-[11px] text-agrobamba-olive mt-0.5 font-sans">{{ stat.detail }}</p>
        </div>
      </div>

    </div>
  </section>
</template>
