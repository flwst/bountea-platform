/**
 * Setup Testnet Asset - Westend Asset Hub
 *
 * This script will:
 * 1. Connect to Westend Asset Hub
 * 2. Find an available asset ID
 * 3. Create the asset
 * 4. Mint test tokens
 * 5. Calculate precompile address
 * 6. Save configuration for deployment
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function findAvailableAssetId(api, startId = 100000) {
    console.log('\n🔍 Buscando Asset ID disponible...');

    for (let id = startId; id < startId + 1000; id++) {
        const asset = await api.query.assets.asset(id);

        if (asset.isNone) {
            console.log(`✅ Asset ID ${id} está DISPONIBLE`);
            return id;
        }

        if (id % 100 === 0) {
            console.log(`   Probando ID ${id}...`);
        }
    }

    throw new Error('No se encontró Asset ID disponible');
}

function calculatePrecompileAddress(assetId) {
    const hex = assetId.toString(16).padStart(56, '0');
    return `0xFFFFFFFF${hex}`;
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Setup Asset de Prueba - Westend Asset Hub           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Opciones de RPC
    const rpcs = [
        'wss://westend-asset-hub-rpc.polkadot.io',
        'wss://sys.ibp.network/westend-asset-hub',
        'wss://westend-asset-hub-rpc.dwellir.com'
    ];

    console.log('RPCs disponibles:');
    rpcs.forEach((rpc, i) => console.log(`  ${i + 1}. ${rpc}`));

    const rpcChoice = await question('\n¿Qué RPC usar? (1-3, default 2): ');
    const selectedRpc = rpcs[parseInt(rpcChoice || '2') - 1];

    console.log(`\n🔗 Conectando a ${selectedRpc}...`);
    const provider = new WsProvider(selectedRpc);
    const api = await ApiPromise.create({ provider });

    console.log('✅ Conectado a Westend Asset Hub');
    console.log(`   Chain: ${await api.rpc.system.chain()}`);
    console.log(`   Version: ${await api.rpc.system.version()}`);

    // Método de autenticación
    console.log('\n📝 Opciones de cuenta:');
    console.log('  1. Usar seed phrase');
    console.log('  2. Solo ver información (sin crear asset)');

    const authChoice = await question('\nElige opción (1-2): ');

    if (authChoice === '2') {
        // Solo mostrar información
        const testId = await question('\n¿Qué Asset ID quieres verificar? (ej: 99999): ');
        const asset = await api.query.assets.asset(parseInt(testId));

        if (asset.isNone) {
            console.log(`\n✅ Asset ID ${testId} está DISPONIBLE`);
            const precompile = calculatePrecompileAddress(parseInt(testId));
            console.log(`\n📋 Información para deployment:`);
            console.log(`   Asset ID: ${testId}`);
            console.log(`   Precompile: ${precompile}`);
            console.log(`\n⚠️  Necesitas crear este asset manualmente en Polkadot.js`);
        } else {
            const assetData = asset.unwrap();
            console.log(`\n❌ Asset ID ${testId} ya existe`);
            console.log(`   Owner: ${assetData.owner.toString()}`);
            console.log(`   Issuer: ${assetData.issuer.toString()}`);

            const availableId = await findAvailableAssetId(api, parseInt(testId) + 1);
            const precompile = calculatePrecompileAddress(availableId);
            console.log(`\n📋 Usa este Asset ID en su lugar:`);
            console.log(`   Asset ID: ${availableId}`);
            console.log(`   Precompile: ${precompile}`);
        }

        await api.disconnect();
        rl.close();
        return;
    }

    // Crear asset con seed phrase
    await cryptoWaitReady();

    console.log('\n🔐 Ingresa tu seed phrase de Talisman');
    console.log('   (Ejemplo: word1 word2 word3 ... word12)');
    const seedPhrase = await question('\nSeed phrase: ');

    const keyring = new Keyring({ type: 'sr25519' });
    let account;

    try {
        account = keyring.addFromUri(seedPhrase.trim());
        console.log(`✅ Cuenta cargada: ${account.address}`);

        // Verificar balance
        const { data: balance } = await api.query.system.account(account.address);
        const wndBalance = balance.free.toNumber() / 1e12;
        console.log(`   Balance: ${wndBalance.toFixed(4)} WND`);

        if (wndBalance < 1) {
            console.log('\n⚠️  WARNING: Balance bajo. Necesitas al menos 1 WND');
            console.log('   Faucet: https://faucet.polkadot.io/westend');
            const continueAnyway = await question('\n¿Continuar? (y/n): ');
            if (continueAnyway.toLowerCase() !== 'y') {
                await api.disconnect();
                rl.close();
                return;
            }
        }
    } catch (error) {
        console.error('\n❌ Error: Seed phrase inválida');
        await api.disconnect();
        rl.close();
        return;
    }

    // Encontrar Asset ID disponible
    const assetId = await findAvailableAssetId(api);
    const precompileAddress = calculatePrecompileAddress(assetId);

    console.log(`\n📋 Configuración:`);
    console.log(`   Asset ID: ${assetId}`);
    console.log(`   Precompile: ${precompileAddress}`);
    console.log(`   Admin: ${account.address}`);

    const confirm = await question('\n¿Crear asset? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        await api.disconnect();
        rl.close();
        return;
    }

    // Crear asset
    console.log('\n⏳ Creando asset...');

    try {
        const createTx = api.tx.assets.create(
            assetId,
            account.address, // admin
            1 // minBalance
        );

        await new Promise((resolve, reject) => {
            createTx.signAndSend(account, ({ status, events, dispatchError }) => {
                if (status.isInBlock) {
                    console.log(`   📦 Incluido en bloque: ${status.asInBlock}`);
                }

                if (status.isFinalized) {
                    if (dispatchError) {
                        if (dispatchError.isModule) {
                            const decoded = api.registry.findMetaError(dispatchError.asModule);
                            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs}`));
                        } else {
                            reject(new Error(dispatchError.toString()));
                        }
                    } else {
                        console.log(`   ✅ Finalizado en bloque: ${status.asFinalized}`);
                        resolve();
                    }
                }
            });
        });

        console.log('✅ Asset creado exitosamente!');

        // Set metadata
        console.log('\n⏳ Configurando metadata...');
        const metadataTx = api.tx.assets.setMetadata(
            assetId,
            'Test USDC',
            'tUSDC',
            6 // decimals
        );

        await new Promise((resolve, reject) => {
            metadataTx.signAndSend(account, ({ status, dispatchError }) => {
                if (status.isFinalized) {
                    if (dispatchError) {
                        console.log('   ⚠️  Error setting metadata (no crítico)');
                        resolve();
                    } else {
                        console.log('   ✅ Metadata configurada');
                        resolve();
                    }
                }
            });
        });

        // Mint tokens
        const mintAmount = await question('\n¿Cuántos tokens hacer mint? (ej: 1000000 = 1M): ');
        console.log('\n⏳ Haciendo mint de tokens...');

        const mintTx = api.tx.assets.mint(
            assetId,
            account.address,
            BigInt(mintAmount) * BigInt(1e6) // Asumiendo 6 decimals
        );

        await new Promise((resolve, reject) => {
            mintTx.signAndSend(account, ({ status, dispatchError }) => {
                if (status.isFinalized) {
                    if (dispatchError) {
                        if (dispatchError.isModule) {
                            const decoded = api.registry.findMetaError(dispatchError.asModule);
                            reject(new Error(`${decoded.section}.${decoded.name}`));
                        } else {
                            reject(new Error(dispatchError.toString()));
                        }
                    } else {
                        console.log('   ✅ Tokens minteados');
                        resolve();
                    }
                }
            });
        });

        // Guardar configuración
        const config = {
            network: 'westend-asset-hub',
            assetId: assetId,
            precompileAddress: precompileAddress,
            admin: account.address,
            symbol: 'tUSDC',
            decimals: 6,
            totalSupply: mintAmount,
            rpc: selectedRpc,
            createdAt: new Date().toISOString()
        };

        fs.writeFileSync(
            'testnet-asset-config.json',
            JSON.stringify(config, null, 2)
        );

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║                 ✅ COMPLETADO                          ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log(`\n📋 Asset de prueba creado:`);
        console.log(`   Asset ID: ${assetId}`);
        console.log(`   Precompile: ${precompileAddress}`);
        console.log(`   Symbol: tUSDC`);
        console.log(`   Balance: ${mintAmount} tokens`);
        console.log(`\n💾 Configuración guardada en: testnet-asset-config.json`);
        console.log(`\n🚀 Siguiente paso:`);
        console.log(`   npx hardhat run scripts/deploy-game-escrow.js --network polkadotAssetHubTestnet`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    await api.disconnect();
    rl.close();
}

main().catch(console.error);
