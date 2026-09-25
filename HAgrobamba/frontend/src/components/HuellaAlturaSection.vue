<script setup>
import { ref, reactive } from 'vue'
import { 
  ShieldCheck, 
  MapPin, 
  Search, 
  Cpu, 
  Layers, 
  QrCode, 
  CheckCircle2, 
  Activity,
  Globe,
  Compass,
  FileCheck,
  RefreshCw
} from 'lucide-vue-next'

// Reactive state for traceability search (ready for FastAPI API GET /api/v1/traceability/{batch_id})
const batchQuery = ref('MND-2026-8812')
const isSearching = ref(false)
const searchSuccess = ref(true)

// Reactive telemetry response mock
const traceData = reactive({
  batchId: 'MND-2026-8812',
  parcelName: 'Parcela Cerro Mandango Sector A-3',
  farmer: 'Familia Armijos & Cooperativa Agrobamba',
  altitude: '1,950 msnm',
  coordinates: '04°18\'22"S 79°13\'10"W',
  cropType: 'Café Typica & Bourbon Selección Especial',
  harvestDate: '14 de Agosto, 2026',
  dryingMethod: 'Marquesina Solar Ecológica (18 días)',
  scaScore: 88.5,
  eudrStatus: 'CONFORME (Sin Deforestación)',
  blockchainHash: '0x89f4b12c9e7a83d401fe2a88',
  soilMetrics: {
    ph: 6.2,
    moisture: '38%',
    nitrogen: 'Óptimo',
    temperature: '19.4 °C'
  }
})

const handleTraceSearch = () => {
  if (!batchQuery.value.trim()) return
  isSearching.value = true
  setTimeout(() => {
    isSearching.value = false
    traceData.batchId = batchQuery.value.toUpperCase()
    searchSuccess.value = true
  }, 600)
}
</script>

<template>
  <section id="trazabilidad" class="py-20 lg:py-32 bg-gradient-to-b from-agrobamba-surface to-agrobamba-sand/60 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div class="text-center max-w-3xl mx-auto space-y-4">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agrobamba-emerald/10 border border-agrobamba-emerald/30 text-agrobamba-emerald text-xs font-semibold uppercase tracking-wider">
          <Globe class="w-3.5 h-3.5 text-agrobamba-emerald" />
          <span>SISTEMA DE HUELLA DE ALTURA GEOSPATIAL</span>
        </div>
        <h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-agrobamba-forest tracking-tight">
          Portal de Trazabilidad Satelital & IoT
        </h2>
        <p class="text-base sm:text-lg text-agrobamba-olive leading-relaxed font-sans">
          Garantizamos la autenticidad y el origen de cada lote. Verifique datos de altitud, nutrición del suelo y la certificación de deforestación cero exigida por la normativa europea EUDR.
        </p>
      </div>

      <!-- Search Input Box -->
      <div class="mt-10 max-w-2xl mx-auto">
        <form @submit.prevent="handleTraceSearch" class="p-2 bg-white rounded-2xl border border-agrobamba-border shadow-agrobamba-md flex flex-col sm:flex-row gap-2">
          <div class="relative flex-grow flex items-center">
            <Search class="w-5 h-5 text-agrobamba-olive/60 absolute left-3.5" />
            <input
              v-model="batchQuery"
              type="text"
              placeholder="Ingrese código de lote (ej. MND-2026-8812)"
              class="w-full pl-11 pr-4 py-3 rounded-xl text-sm font-mono bg-agrobamba-surface border border-agrobamba-border/80 focus:border-agrobamba-forest focus:ring-2 focus:ring-agrobamba-amber/20 focus:outline-none transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            :disabled="isSearching"
            class="px-6 py-3 rounded-xl bg-agrobamba-forest hover:bg-agrobamba-forest-light text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
          >
            <RefreshCw v-if="isSearching" class="w-4 h-4 animate-spin text-agrobamba-amber" />
            <ShieldCheck v-else class="w-4 h-4 text-agrobamba-amber" />
            <span>{{ isSearching ? 'Consultando...' : 'Consultar Lote' }}</span>
          </button>
        </form>
      </div>

      <!-- Telemetry Dashboard Card -->
      <div class="mt-12 bg-white rounded-2xl border border-agrobamba-border shadow-agrobamba-lg overflow-hidden">
        
        <!-- Top Status Bar -->
        <div class="bg-agrobamba-forest text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-agrobamba-amber/20 border border-agrobamba-amber flex items-center justify-center text-agrobamba-amber">
              <Cpu class="w-5 h-5" />
            </div>
            <div>
              <span class="text-[10px] font-mono tracking-widest text-agrobamba-amber uppercase block">LOTE EN TELEMETRÍA</span>
              <h3 class="font-serif text-xl sm:text-2xl font-bold font-mono text-white">{{ traceData.batchId }}</h3>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-full bg-agrobamba-emerald/20 border border-agrobamba-emerald text-agrobamba-amber text-xs font-semibold font-mono flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4 text-agrobamba-emerald" />
              <span>EUDR VERIFIED</span>
            </span>
            <span class="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-mono">
              SCA {{ traceData.scaScore }}
            </span>
          </div>
        </div>

        <!-- Dashboard Content Grid -->
        <div class="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Parcel & Geographic Detail -->
          <div class="lg:col-span-7 space-y-6">
            
            <div class="space-y-3">
              <span class="text-xs font-bold uppercase text-agrobamba-coffee tracking-wider block">INFORMACIÓN DEL PREDIO</span>
              <h4 class="font-serif text-2xl font-bold text-agrobamba-forest">{{ traceData.parcelName }}</h4>
              <p class="text-sm text-agrobamba-olive">Productor: <strong>{{ traceData.farmer }}</strong></p>
            </div>

            <!-- Geo Metrics Cards Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="p-3.5 rounded-xl bg-agrobamba-sand/60 border border-agrobamba-border">
                <span class="text-[10px] font-mono text-agrobamba-olive uppercase block">ALTITUD</span>
                <span class="font-serif text-lg font-bold text-agrobamba-forest">{{ traceData.altitude }}</span>
              </div>
              <div class="p-3.5 rounded-xl bg-agrobamba-sand/60 border border-agrobamba-border">
                <span class="text-[10px] font-mono text-agrobamba-olive uppercase block">VARIEDAD</span>
                <span class="font-serif text-sm font-bold text-agrobamba-forest line-clamp-1">Typica / Bourbon</span>
              </div>
              <div class="p-3.5 rounded-xl bg-agrobamba-sand/60 border border-agrobamba-border">
                <span class="text-[10px] font-mono text-agrobamba-olive uppercase block">COSECHA</span>
                <span class="font-serif text-xs font-bold text-agrobamba-forest">{{ traceData.harvestDate }}</span>
              </div>
            </div>

            <!-- IoT Soil Metrics -->
            <div class="p-4 rounded-xl bg-agrobamba-surface border border-agrobamba-border space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase text-agrobamba-forest tracking-wider flex items-center gap-1.5">
                  <Activity class="w-4 h-4 text-agrobamba-amber" />
                  Métricas de Sensores IoT en Suelo
                </span>
                <span class="text-[10px] font-mono text-agrobamba-emerald font-semibold">Actualizado hace 5 min</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div class="bg-white p-2 rounded-lg border border-agrobamba-border">
                  <span class="text-agrobamba-olive text-[10px] block">pH Suelo</span>
                  <span class="font-bold text-agrobamba-forest font-mono">{{ traceData.soilMetrics.ph }}</span>
                </div>
                <div class="bg-white p-2 rounded-lg border border-agrobamba-border">
                  <span class="text-agrobamba-olive text-[10px] block">Humedad</span>
                  <span class="font-bold text-agrobamba-forest font-mono">{{ traceData.soilMetrics.moisture }}</span>
                </div>
                <div class="bg-white p-2 rounded-lg border border-agrobamba-border">
                  <span class="text-agrobamba-olive text-[10px] block">Nitrógeno (N)</span>
                  <span class="font-bold text-agrobamba-emerald font-mono">{{ traceData.soilMetrics.nitrogen }}</span>
                </div>
                <div class="bg-white p-2 rounded-lg border border-agrobamba-border">
                  <span class="text-agrobamba-olive text-[10px] block">Temp. Radicular</span>
                  <span class="font-bold text-agrobamba-forest font-mono">{{ traceData.soilMetrics.temperature }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Certificate & QR Code Side Column -->
          <div class="lg:col-span-5 flex flex-col justify-between p-6 rounded-xl bg-agrobamba-sand/40 border border-agrobamba-border space-y-6">
            
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-lg bg-white border border-agrobamba-border text-agrobamba-coffee">
                  <FileCheck class="w-6 h-6" />
                </div>
                <div>
                  <h5 class="font-serif font-bold text-agrobamba-forest">Pase de Exportación Digital</h5>
                  <p class="text-xs text-agrobamba-olive">Registro inmutable de origen agrícola</p>
                </div>
              </div>

              <!-- Map Pin info -->
              <div class="bg-white p-3 rounded-xl border border-agrobamba-border text-xs space-y-1">
                <div class="flex items-center gap-1.5 text-agrobamba-forest font-semibold">
                  <Compass class="w-4 h-4 text-agrobamba-amber" />
                  <span>Coordenadas de Origen GPS:</span>
                </div>
                <p class="font-mono text-agrobamba-olive text-[11px]">{{ traceData.coordinates }}</p>
              </div>

              <!-- Blockchain Hash snippet -->
              <div class="bg-white p-3 rounded-xl border border-agrobamba-border text-xs space-y-1">
                <span class="text-[10px] font-mono text-agrobamba-olive uppercase block">BLOCKCHAIN HASH HUELLA DE ALTURA</span>
                <p class="font-mono text-[11px] text-agrobamba-coffee truncate">{{ traceData.blockchainHash }}</p>
              </div>
            </div>

            <!-- Simulated QR Visual -->
            <div class="flex items-center gap-4 bg-white p-4 rounded-xl border border-agrobamba-border shadow-sm">
              <div class="w-16 h-16 bg-agrobamba-forest text-agrobamba-amber rounded-lg flex items-center justify-center shrink-0">
                <QrCode class="w-10 h-10" />
              </div>
              <div class="text-xs space-y-1">
                <span class="font-bold text-agrobamba-forest block">Escanear para Informe Completo</span>
                <p class="text-[11px] text-agrobamba-olive">Descargue certificado PDF firmado digitalmente.</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  </section>
</template>
