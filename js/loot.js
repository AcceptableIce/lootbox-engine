(function() {
	function querySheet(gid, query) {
		return new Promise((resolve, reject) => {
			window.sheetrock({
				url: `https://docs.google.com/spreadsheets/d/1LVDa78W710kO41AjrWS5fETCSCb9N_n2-7kAYHvRedw/edit#gid=${gid}`,
				query: query,
				callback: (err, options, response) => {
					if(err) {
						reject(err);
					} else {
						resolve(response.rows.slice(1));
					}
				}
			});
		});
	}

	function queryConfig(query) {
		return querySheet(0, query);
	}

	function queryPools(query) {
		return querySheet(1589065672, query);
	}

	Promise.all([
		queryConfig("select A, B where A is not null and B is not null"),
		queryConfig("select D, E where D is not null and E is not null"),
		queryPools("select *")
	]).then(responses => {
		const rarities = {};
		const drops = {};
		const pools = {};

		responses[0].forEach(item => {
			rarities[item.cellsArray[0]] = item.cellsArray[1];
		});

		responses[1].forEach(item => {
			drops[item.cellsArray[0]] = {
				name: item.cellsArray[0],
				rarity: item.cellsArray[1]
			};
		});

		responses[2].forEach(item => {
			if(!pools[item.labels[0]]) {
				pools[item.labels[0]] = [];
			}

			pools[item.labels[0]].push(drops[item.cellsArray[0]]);
		});

		const rollerContainer = document.querySelector(".rollers");

		Object.keys(pools).forEach(poolName => {
			const button = document.createElement("button");
			button.innerHTML = `Roll ${poolName}<br>(${pools[poolName].length} items)`;

			button.onclick = () => {
				const items = pools[poolName];
				let relevantRarities = {};

				items.forEach(item => {
					if(!relevantRarities[item.rarity]) {
						relevantRarities[item.rarity] = {
							name: item.rarity,
							odds: Number(rarities[item.rarity]),
							items: []
						}
					}

					relevantRarities[item.rarity].items.push(item);
				});
				const rarityList = Object.values(relevantRarities);

				let rarityTotal = 0;
				let wasNormalized = false;

				rarityList.forEach(rarity => rarityTotal += rarity.odds);

				// Normalize the rarities.
				if(rarityTotal !== 1) {
					wasNormalized = true;

					rarityList.forEach(rarity => rarity.odds /= rarityTotal);
				}

				rarityList.sort((a, b) => b.odds - a.odds);

				const roll = Math.random();
				let rollProgress = 0;

				for(let rarity of rarityList) {
					if(roll < rarity.odds + rollProgress) {
						const itemsOfRarity = relevantRarities[rarity.name].items;
						const rolledItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];

						const rollContainer = document.querySelector(".roll");
						rollContainer.textContent = `Rolled ${Math.floor(roll * 100)}`;

						rollContainer.classList.remove("low", "medium", "high");

						if(roll < 0.35) {
							rollContainer.classList.add("low")
						} else if(roll < 0.70) {
							rollContainer.classList.add("medium");
						} else {
							rollContainer.classList.add("high");
						}

						document.querySelector(".item").textContent = rolledItem.name;

						const rarityContainer = document.querySelector(".rarities");

						rarityContainer.innerHTML = "";

						rarityList.forEach(item => {
							const rarityItem = document.createElement("div");

							rarityItem.className = "rarity";
							rarityItem.innerHTML = `<div class="name">${item.name}</div><div class="odds">${Math.floor(item.odds * 100)}%</div>`;

							rarityContainer.appendChild(rarityItem);
						});

						const normalizationWarning = document.querySelector(".normalizationWarning");

						if(wasNormalized) {
							normalizationWarning.classList.remove("hidden");
						} else {
							normalizationWarning.classList.add("hidden");
						}

						break;
					} else {
						rollProgress += rarity.odds;
					}
				};
			};

			rollerContainer.appendChild(button);
		})
	});
})();
