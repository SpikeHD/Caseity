const { invoke } = window.__TAURI__.tauri
const { listen } = window.__TAURI__.event

const rarityMap = {
  Rarity_Rare_Weapon: 'bl',
  Rarity_Mythical_Weapon: 'pu',
  Rarity_Legendary_Weapon: 'pi',
  Rarity_Ancient_Weapon: 're',
  Rarity_Ancient: 'go' 
}

const wearMap = {
  'Factory New': 'fn',
  'Minimal Wear': 'mw',
  'Field-Tested': 'ft',
  'Well-Worn': 'ww',
  'Battle-Scarred': 'bs'
}

const officialOdds = {
  bl: 79.92,
  pu: 15.98,
  pi: 3.19,
  re: 0.63,
  go: 0.25,
}

document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.querySelector('button')
  const main = document.querySelector('#main')
  const calc = document.querySelector('#calculate')
  const cookie = document.querySelector('#cookie')

  const prog = document.querySelector('#progress')
  const loading = document.querySelector('#loading')

  // Load existing dumps
  const dumps = await invoke('list_dumps')

  const dumpElm = document.querySelector('#dumps')

  for (dump of dumps) {
    const dumpDiv = document.createElement('div')
    dumpDiv.classList.add('dump')
    dumpDiv.innerHTML = dump

    dumpDiv.addEventListener('click', async () => {
      const data = await invoke('get_dump', {
        path: dump
      })

      prog.classList.add('hide')
      loading.classList.add('hide')
      main.classList.add('hide')

      calc.classList.remove('hide')
      calc.classList.add('showResults')

      showHistory(data)
      processStats(data)
    })

    dumpElm.appendChild(dumpDiv)
  }

  btn.addEventListener('click', () => {
    btn.classList.add('clicked')
    
    main.classList.add('hide')
    calc.classList.remove('hide')
  
    // Invoke tauri method to begin processing
    invoke('get_main', {
      cookie: cookie.value
    })

    // Listen for tauri page process
    listen('page_process', ({ payload }) => {
      prog.innerHTML = `${payload} pages...`
    })

    listen('finish_process', ({ payload }) => {
      prog.classList.add('hide')
      loading.classList.add('hide')
      calc.classList.add('showResults')

      showHistory(payload)

      processStats(payload)

      console.log(payload)
    })
  })
})

async function showHistory(data) {
  const history = document.querySelector('#history')
  history.classList.remove('hide')

  for (chunk of data) {
    const row = document.createElement('div')
    row.classList.add('row')

    const box = document.createElement('div')
    const boxImg = document.createElement('img')
    const boxName = document.createElement('div')
    box.classList.add('cell')
    boxImg.src = chunk.case_img
    boxName.innerHTML = chunk.case

    box.appendChild(boxImg)
    box.appendChild(boxName)
    
    const arrow = document.createElement('div')
    arrow.classList.add('cell')

    const arrowImg = document.createElement('img')
    arrowImg.src = 'assets/arrow.svg'
    arrowImg.classList.add('arrow')
    arrow.appendChild(arrowImg)

    const date = document.createElement('div')
    date.innerHTML = chunk.date.replace(/[\r\n\t]/g, '')
    arrow.appendChild(date)

    const item = document.createElement('div')
    const itemImg = document.createElement('img')
    const itemName = document.createElement('div')
    item.classList.add('cell')
    itemImg.src = chunk.result_img
    itemName.innerHTML = `${chunk.result} (${chunk.rarity.condition})`

    // Set color for item
    switch(chunk.rarity.rarity) {
      case 'Rarity_Rare_Weapon':
        item.classList.add('blue')
        break

      case 'Rarity_Mythical_Weapon':
        item.classList.add('purple')
        break
      
      case 'Rarity_Legendary_Weapon':
        item.classList.add('pink')
        break

      case 'Rarity_Ancient_Weapon':
        item.classList.add('red')
        break

      case 'Rarity_Ancient':
        item.classList.add('gold')
        break
    }

    item.appendChild(itemImg)
    item.appendChild(itemName)

    row.appendChild(box)
    row.appendChild(arrow)
    row.appendChild(item)

    history.appendChild(row)
  }
}

async function processStats(data) {
  const rarityCount = {}
  const conditionCount = {}
  let stattrakCount = 0
  let caseCount = data.filter(d => !d.result.includes('Sticker')).length
  const keyCostEst = 2.5 * caseCount

  // Get counts for each rarity and condition
  for (chunk of data) {
    if (rarityCount[chunk.rarity.rarity]) {
      rarityCount[chunk.rarity.rarity]++
    } else {
      rarityCount[chunk.rarity.rarity] = 1
    }

    if (conditionCount[chunk.rarity.condition]) {
      conditionCount[chunk.rarity.condition]++
    } else {
      conditionCount[chunk.rarity.condition] = 1
    }

    if (chunk.result.includes('StatTrak')) stattrakCount++
  }

  // Get averages for rarities and qualities
  for (rarity in rarityCount) {
    rarityCount[rarity] = (rarityCount[rarity] / caseCount * 100).toFixed(2)
  }

  for (condition in conditionCount) {
    conditionCount[condition] = (conditionCount[condition] / caseCount * 100).toFixed(2)
  }

  // Get stattrak percentage
  const stattrakAvg = (stattrakCount / caseCount * 100).toFixed(2)

  // Set text for each rarity
  for (rarity of Object.keys(rarityCount)) {
    const rarityText = document.querySelector(`#${rarityMap[rarity]} .result`)
    if (rarityText) rarityText.innerHTML = `${rarityCount[rarity]}% (odds: ${officialOdds[rarityMap[rarity]]}%)`
  }

  for (cond of Object.keys(conditionCount)) {
    const condText = document.querySelector(`#${wearMap[cond]} .result`)
    if (condText) condText.innerHTML = `${conditionCount[cond]}%`
  }

  const stattrakText = document.querySelector(`#st .result`)
  stattrakText.innerHTML = `${stattrakAvg}% (${stattrakCount})`

  const avgs = document.querySelector('#averages')
  avgs.classList.remove('hide')

  const totalCases = document.querySelector('#to .result')
  totalCases.innerHTML = `${data.length}`

  const totalNoSticker = document.querySelector('#toc .result')
  totalNoSticker.innerHTML = `${caseCount}`

  const keyCost = document.querySelector('#kc .result')
  keyCost.innerHTML = `$${keyCostEst.toFixed(2)}`

  console.log(rarityCount)
  console.log(conditionCount)
  console.log(stattrakCount)
}