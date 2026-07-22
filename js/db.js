// Banco de dados em LocalStorage
const DB = {
    get: (key) => JSON.parse(localStorage.getItem(`pneucontrol_${key}`)) || [],
    set: (key, data) => localStorage.setItem(`pneucontrol_${key}`, JSON.stringify(data)),

    init() {
        if (!localStorage.getItem('pneucontrol_init')) {
            const carretasIniciais = [
                { id: '1', placa: 'ABC-1234', modelo: '3 Eixos Standard', kmAtual: 145000, eixos: 3 },
                { id: '2', placa: 'XYZ-9876', modelo: 'Vanderléia 3 Eixos', kmAtual: 92000, eixos: 3 }
            ];

            const pneusIniciais = [
                { id: '101', fuego: 'P-001', marca: 'Michelin', modelo: 'X Multi', medida: '295/80 R22.5', valor: 2400, sulcoAtual: 14, vida: 'Nova', status: 'Em Uso', carretaId: '1', posicao: 'E1D', kmRodados: 12000 },
                { id: '102', fuego: 'P-002', marca: 'Bridgestone', modelo: 'R268', medida: '295/80 R22.5', valor: 2100, sulcoAtual: 2.8, vida: '1ª Recapagem', status: 'Em Uso', carretaId: '1', posicao: 'E1E', kmRodados: 45000 },
                { id: '103', fuego: 'P-003', marca: 'Pirelli', modelo: 'TR01', medida: '295/80 R22.5', valor: 2250, sulcoAtual: 11, vida: 'Nova', status: 'Estoque', carretaId: null, posicao: null, kmRodados: 0 }
            ];

            this.set('carretas', carretasIniciais);
            this.set('pneus', pneusIniciais);
            this.set('historico', []);
            localStorage.setItem('pneucontrol_init', 'true');
        }
    }
};

DB.init();
