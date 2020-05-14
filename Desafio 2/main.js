const CellColors = [
	'transparent',
	'blue',
	'green',
	'red',
	'purple',
	'maroon',
	'turquoise',
	'black',
];

// Cell class declaration
class Cell {
	constructor (root, x, y, map) {
    // Create a div element
		const element = document.createElement('div');
    // Add class cell and hidden to the created div element
		element.classList.add('cell', 'hidden');
    // Append div on root element
		root.appendChild(element);

		element.addEventListener('click', () => map.cellLeftClick(this));
		element.addEventListener('contextmenu', event => {
			event.preventDefault();
			map.cellRightClick(this);
			return false;
		});

		this.element = element;
		this.visited = false;
		this.isFlagged = false;
		this.isBomb = false;
		this.value = 0;
		this.x = x;
		this.y = y;
	}

	reveal () {
		if (this.visited) return;
    // Replace class hidden with class revealed on the div element
		this.element.classList.replace('hidden', 'revealed');
		if (this.isBomb) {
			//if a flag is on a bomb cell paints the cell green
			if (this.isFlagged) this.element.style.backgroundColor = 'green';
			this.element.classList.add('bomb');
		} else {
			this.element.innerText = this.value;
			this.element.style.color = CellColors[this.value] || 'black';
		}
		this.visited = true;
		setTimeout(4000);
	}

	// *************************************************************************************
	// Here you need to implement toggleFlag function that depending on isFlagged letiable
	// will apply or remove the css class 'flag' from the this instantiate element
	// and will invert the flag
	// (This function is called inside cellRightClick function that is in the Map class,
	// you dont need to worry about that)
	// *************************************************************************************

	toggleFlag() {
		if (this.isFlagged) {
			this.element.classList.remove('flag');
			this.isFlagged = false;
		} else {
			this.element.classList.add('flag');
			this.isFlagged = true;
		}

	}
}

class Map {
	constructor (root, width, height, numberOfBombs) {
		this.cells = [];
		this.width = width;
		this.height = height;
		this.bombCount = numberOfBombs;
		this.hasMapBeenClickedYet = false;
		this.isGameOver = false;
		this.visibleCells = 0;
		this.lives = location.search[7]; //gets the total lives from URL (query string)

		for (let row = 0; row < height; row ++) {
			this.cells.push([]);
			for (let column = 0; column < width; column ++) {
				this.cells[row].push(new Cell(root, column, row, this));
			}
		}

		root.style.gridTemplateColumns = `repeat(${width}, max-content)`;
	}

	// Used to verify if the given position is outside the map bounds
	doesPositionExist (x, y) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
		return true;
	}

	// Iterates over each neighbor of a cell, calling `callback` with a cell as argument.
	forEachNeighbor (cell, callback) {
		for (let newY = cell.y - 1; newY <= cell.y + 1; newY ++) {
			for (let newX = cell.x - 1; newX <= cell.x + 1; newX ++) {
				if (!this.doesPositionExist(newX, newY)) continue;
				if (newX === cell.x && newY === cell.y) continue;
				callback(this.cells[newY][newX]);
			}
		}
	}

	countBombsAroundCell (cell) {
		let bombs = 0;
		this.forEachNeighbor(cell, neighbor => {
			if (neighbor.isBomb) bombs ++;
		});
		return bombs;
	}

	placeAllNumbersInMap () {
		for (let row = 0; row < this.height; row ++){
			for (let column = 0; column < this.width; column ++){
				const cell = this.cells[row][column];
				if (cell.isBomb) continue;
				cell.value = this.countBombsAroundCell(cell);
			}
		}
	}

	// Finds proper positions to bombs
	placeAllBombsInMap (clickX, clickY) {
		const generateBombSomewhere = async () => {
			let x, y;
			do {
				x = Math.floor(Math.random() * this.width);
				y = Math.floor(Math.random() * this.height);
			} while (
				this.cells[y][x].isBomb ||
				(Math.abs(x - clickX) <= 1 && Math.abs(y - clickY) <= 1)
			);

			this.cells[y][x].isBomb = true;
		}

		for (let i = 0; i < this.bombCount; i ++) {
			generateBombSomewhere();
		}
	}

	// Funtion called when player left clicks a cell
	cellLeftClick (clickedCell) {
		if (this.isGameOver) return;
		if (clickedCell.isFlagged) return;
		if (clickedCell.visited) return;
		if (!this.hasMapBeenClickedYet) {
			this.placeAllBombsInMap(clickedCell.x, clickedCell.y);
			this.placeAllNumbersInMap();
			this.hasMapBeenClickedYet = true;
		}
		if (clickedCell.isBomb) {
			clickedCell.element.style.backgroundColor = 'red';
			this.gameOver();
			return;
		}
		clickedCell.reveal();
		this.visibleCells ++;
		if (this.didPlayerWin()) {
			setTimeout(() => alert('Congratulations, you won!'));
		}

		// If the cell is empty, open all surrounding cells.
		if (clickedCell.value === 0 && !clickedCell.isFlagged) {
			this.forEachNeighbor(clickedCell, cell => this.cellLeftClick(cell));
		}
	}

	didPlayerWin () {
		return this.visibleCells >= this.width * this.height - this.bombCount;
	}

	cellRightClick (clickedCell) {
		if (this.isGameOver) return;
		if (clickedCell.visited) return;
		clickedCell.toggleFlag();
	}

	gameOver () {
		for (let row = 0; row < this.height; row ++) {
			for (let column = 0; column < this.width; column ++) {
				const cell = this.cells[row][column];
				if (cell.isBomb && !cell.isFlagged) cell.reveal();
			}
		}
		let url = location.href;
		
		if (this.lives > 0) {
			this.lives = this.lives - 1; //player lost 1 turn, update total lives
			url = url.replace(`lives=${this.lives + 1}`, `lives=${this.lives}`); //update total lives at query string
			alert(`Você perdeu. Vidas restantes = ${this.lives}`);

			for (let row = 0; row < this.height; row ++) {
				for (let column = 0; column < this.width; column ++) {
					const cell = this.cells[row][column];
					if (cell.isBomb && cell.isFlagged) cell.reveal();
				}
			}

			setInterval(function() {window.location.href = url; }, 3000); //wait 3 seconds and restart the game
		} else {
			this.isGameOver = true;
			alert('Fim do jogo!');
		}
		
	}
}

//properties like mode (easy, medium, hard, expert), number of lives, 
//table width and height are passed through query string (URL)
let sendQueryString = function(mode, lives, width, height) {
	let url = document.location.href;
	url = url.replace('index.html', 'game.html') + "?lives=" + lives + "&width=" + width + "&height=" + height + "&mode=" + mode;
	window.location.href = url;
}

//gets URL of current page
let url = document.location.href;

//if current page is index.html
if (url.includes('index.html')) {
	document.getElementById('easy').addEventListener('click', () => {
		let dimensions = document.querySelector('#dimensions').value;
		
		if (dimensions == 0) {
			dimensions = []
			//width and height standard values for easy mode (if dimensions' input is empty)
			dimensions.push(25);
			dimensions.push(20);
		} else {
			dimensions = dimensions.split(" ");
		}
		
		sendQueryString('easy', 3, dimensions[0], dimensions[1]);
	});

	document.getElementById('medium').addEventListener('click', () => {
		let dimensions = document.querySelector('#dimensions').value;
		
		if (dimensions == 0) {
			dimensions = []
			//width and height standard values for medium mode (if dimensions' input is empty)
			dimensions.push(28);
			dimensions.push(16);
		} else {
			dimensions = dimensions.split(" ");
		}
		sendQueryString('medium', 3, dimensions[0], dimensions[1]);
	});

	document.getElementById('hard').addEventListener('click', () => {
		let dimensions = document.querySelector('#dimensions').value;
		
		if (dimensions == 0) {
			dimensions = []
			//width and height standard values for hard mode (if dimensions' input is empty)
			dimensions.push(50);
			dimensions.push(30);
		} else {
			dimensions = dimensions.split(" ");
		}
		sendQueryString('hard', 3, dimensions[0], dimensions[1]);
	});

	document.getElementById('expert').addEventListener('click', () => {
		let dimensions = document.querySelector('#dimensions').value;
		
		if (dimensions == 0) {
			dimensions = []
			//width and height standard values for expert mode (if dimensions' input is empty)
			dimensions.push(50);
			dimensions.push(30);
		} else {
			dimensions = dimensions.split(" ");
		}
		sendQueryString('expert', 3, dimensions[0], dimensions[1]);
	});
}

//if current page is game.html
if (url.includes('game.html')) {
	//updates life score at the top of the page
	let lifeScoreElement = document.querySelector('#lifeScore');
	lifeScoreElement.innerText = lifeScoreElement.innerText + ' ' + location.search[7];

	//split query string parameters into an array
	let params = location.search.split('&');
	let mode = '', width, height, bombs;

	for (let i = 0; i < params.length; i++) {
		if (params[i].includes('width')) {
			width = params[i].substring(params[i].indexOf('=') + 1);
		} else if (params[i].includes('height')) {
			height = params[i].substring(params[i].indexOf('=') + 1);
		} else if (params[i].includes('mode')) {
			mode = params[i].substring(params[i].indexOf('=') + 1);
		}
	}
	
	switch(mode) {
		case 'easy':
			bombs = Math.round(width*height / 10); //maintains the proportion of bombs for custom widths and heights
			new Map(document.getElementById('root'), width, height, bombs);
			break;

		case 'medium':
			bombs = Math.round(width*height / 7); //maintains the proportion of bombs for custom widths and heights
			new Map(document.getElementById('root'), width, height, bombs);
			break;

		case 'hard':
			bombs = Math.round(width*height / 5); //maintains the proportion of bombs for custom widths and heights
			new Map(document.getElementById('root'), width, height, bombs);
			break;

		case 'expert':
			bombs = Math.round(width*height / 3); //maintains the proportion of bombs for custom widths and heights
			new Map(document.getElementById('root'), width, height, bombs);
			break;
	}
	
}
