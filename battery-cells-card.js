/*
  Battery Cells Card – ORIGINALSTRUKTUR
  AUF VOLT UMGESTELLT (3 Nachkommastellen)
  Annahme: Zell-Sensoren liefern Volt (z.B. 3.275)
*/

class BatteryCellsCard extends HTMLElement {
    
    constructor() {
        super();
        console.info(
          '%c 🔋 Battery Cell Card %c v.0.5.0 (Volt) %c ',
          `background: linear-gradient(90deg,#ff0000 0%,#ff0000 2.5%,#ffa500 2.5%,#ffa500 5%,#ffff00 5%,#ffff00 7.5%,#00ee00 7.5%,#00ee00 100%);
           color: #000; font-weight: bold; padding: 6px 12px; border-radius: 4px;`,
          'color: #2e7d32; padding: 4px 8px; border-radius: 4px;',
          'color: #4caf50; font-weight: bold;'
        );

        this._config = {};
        this._hass = null;
        this._vpScale = 1.0;
    }

    static getConfigElement() {
        return document.createElement("battery-cells-card-editor");
    }

    set hass(hass) {
        this._hass = hass;
        this.render();
    }

    setConfig(config) {
        const cfg = Object.assign({}, config || {});
        cfg.background_color = cfg.background_color ?? "rgba(0,0,0,0.65)";
        cfg.card_height = cfg.card_height ?? 380;
        cfg.show_legend = cfg.show_legend ?? true;
        cfg.soc_entity = cfg.soc_entity ?? 'sensor.soc';
        cfg.watt_entity = cfg.watt_entity ?? 'sensor.pack';
        cfg.container_padding = cfg.container_padding ?? 10;
        cfg.cell_gap = cfg.cell_gap ?? 2;
        cfg.top_padding = cfg.top_padding ?? 20;
        cfg.overlay_opacity = cfg.overlay_opacity ?? 0.70;
        cfg.font_size = cfg.font_size ?? 7.5;
        cfg.title = cfg.title ?? 'Battery Cells';
        cfg.balance_sensor = cfg.balance_sensor ?? null;
        cfg.cell_diff_sensor = cfg.cell_diff_sensor ?? 'sensor.delta_volt';
        cfg.cell_diff = cfg.cell_diff ?? 0.008;        // 8 mV
        cfg.cell_bal_over = cfg.cell_bal_over ?? 3.000; // V
        cfg.show_soc_icon = cfg.show_soc_icon ?? true;
        cfg.show_soc_value = cfg.show_soc_value ?? true;
        cfg.show_sync_icon = cfg.show_sync_icon ?? true;
        cfg.show_cell_diff = cfg.show_cell_diff ?? true;
        cfg.pack_cell_low = cfg.pack_cell_low ?? null;
        cfg.pack_cell_high = cfg.pack_cell_high ?? null;
        cfg.use_3d = cfg.use_3d ?? true;
        cfg.chunk_cells = cfg.chunk_cells ?? false;
        cfg.chunk_size = cfg.chunk_size ?? 8;
        cfg.cells = Array.isArray(cfg.cells) ? cfg.cells : this.constructor.getStubConfig().cells;
        this._config = cfg;
    }

    _isBalancingActive() {
        const cfg = this._config;
        const hass = this._hass;

        if (cfg.balance_sensor) {
            const s = hass.states[cfg.balance_sensor];
            if (s && String(s.state).toLowerCase() === 'on') return true;
        }

        let diffSensorVal = null;
        if (cfg.cell_diff_sensor) {
            const s = hass.states[cfg.cell_diff_sensor];
            const num = parseFloat(s?.state);
            if (!isNaN(num)) diffSensorVal = num;
        }

        const voltages = cfg.cells
            .map(c => parseFloat(hass.states[c.entity]?.state))
            .filter(v => !isNaN(v));

        if (!voltages.length) return false;

        const maxCell = Math.max(...voltages);
        const minCell = Math.min(...voltages);
        const useDiff = diffSensorVal ?? (maxCell - minCell);

        return (useDiff >= cfg.cell_diff && maxCell >= cfg.cell_bal_over);
    }

    _createCell(cfg, width, height, gradientStr) {
        const raw = this._hass.states[cfg.entity]?.state ?? '-';
        const v = parseFloat(raw);
        const isNum = !isNaN(v);
        const display = isNum ? `${v.toFixed(3)} V` : raw;

        let fillPercent = 0;
        if (isNum) {
            if (v <= 2.80) fillPercent = ((v - 2.60) / 0.20) * 5;
            else if (v <= 3.00) fillPercent = ((v - 2.80) / 0.20) * 5 + 5;
            else if (v <= 3.20) fillPercent = ((v - 3.00) / 0.20) * 10 + 10;
            else if (v <= 3.38) fillPercent = ((v - 3.20) / 0.18) * 60 + 20;
            else if (v <= 3.45) fillPercent = ((v - 3.38) / 0.07) * 10 + 80;
            else if (v <= 3.55) fillPercent = ((v - 3.45) / 0.10) * 5 + 90;
            else fillPercent = 100;
        }
        fillPercent = Math.max(0, Math.min(100, fillPercent));

        const cont = document.createElement('div');
        cont.style.width = `${width}px`;
        cont.style.position = 'relative';

        const bar = document.createElement('div');
        bar.style.height = `${height}px`;
        bar.style.background = gradientStr;
        bar.style.position = 'relative';

        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.height = `${100 - fillPercent}%`;
        overlay.style.width = '100%';
        overlay.style.background = `rgba(0,0,0,${this._config.overlay_opacity})`;

        const value = document.createElement('div');
        value.textContent = display;
        value.style.position = 'absolute';
        value.style.bottom = '2px';
        value.style.width = '100%';
        value.style.textAlign = 'center';
        value.style.color = '#fff';
        value.style.fontWeight = '700';

        bar.appendChild(overlay);
        bar.appendChild(value);
        cont.appendChild(bar);
        return cont;
    }

    static getStubConfig() {
        return {
            title: 'Battery Cells',
            cells: Array.from({ length: 8 }, (_, i) => ({
                name: `Cell ${i + 1}`,
                entity: `sensor.cell${i + 1}`
            }))
        };
    }
}

customElements.define('battery-cells-card', BatteryCellsCard);

class BatteryCellsCardEditor extends HTMLElement {
    setConfig() {
        this.innerHTML = `
            <div style="padding:16px;">
                <h3>Battery Cells Card – Settings</h3>
                <p>Änderungen derzeit nur über YAML.</p>
            </div>`;
    }
}

customElements.define('battery-cells-card-editor', BatteryCellsCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'battery-cells-card',
    name: 'Battery Cells Card',
    preview: true,
    description: 'Cell-Monitoring – BMS Visualisation (Volt).' 
});
