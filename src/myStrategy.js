'use strict'; /*jslint node:true*/

module.exports = class Agent {
	

    constructor(me, counts, values, max_rounds, log){
		this.counts = counts;
		
		this.values = values;	
		this.max_rounds = max_rounds;
        this.rounds = max_rounds;
        this.log = log;
        this.total = 0;
        for (let i = 0; i<counts.length; i++)
            this.total += counts[i]*values[i];
		
		this.isFirstPlayer = false;	
				

		this.possibleOffers = this.getPossibleOffersRec(0);	
		this.possibleOffers = this.getNotZeroValuesOffers();
		this.possibleOffers = this.getNotMaxCountOffers();
		this.possibleOffers.sort(comparator(this.values));
		//for (var i in this.possibleOffers)
		//	this.log(this.possibleOffers[i]);	

		
		this.possibleEnemyValues = null;
		this.previousEnemyOffer = null;			
		
		this.myOffers = [];
		this.enemyOffers = [counts];
	}

	// getPreviosOfferIndex(){

	// 	if (this.prevOfferValue == null) return -1;//no offers yet
		
	// 	for (let i = 0; i < this.possibleOffers.length; ++i){
    //         let po = this.possibleOffers[i];
    //         let sumValue = this.getOfferSumValue(po);
    //         if (sumValue < this.prevOfferValue) return i-1
	// 	}
	// 	return this.possibleOffers.length - 1;
	// }

	getMaxPreviosOfferIndex(){		
		let maxIndex = -1;
		for (let i = this.myOffers.length - 1; i >= 0; -- i){
			let offer = this.myOffers[i];
			let index = this.getOfferIndex(offer, this.possibleOffers);
			if (index > maxIndex) maxIndex = index;			
		}
		return maxIndex;
	}

	getReturnBackOfferIndex(){		
		
		let index = -1;		
		for (let i = this.myOffers.length - 1; i >= 0; --i){
			let offer = this.myOffers[i];
			let currIndex = this.getOfferIndex(offer, this.possibleOffers);
			if (currIndex !== -1) {
				index = currIndex;
				break;
			}
		}
		if (index === -1) return 0;		
		
		let offer = this.possibleOffers[index];
		let offerSum = this.getOfferSumValue(offer);
		let enemyOffer = this.getEnemyOffer(offer);
		let averageEnemyValue = this.getAverageEnemyValue(enemyOffer, this.possibleEnemyValues);		
		
		for (let i = this.myOffers.length - 2; i >= 0; --i){
			let currOffer = this.myOffers[i];	
			let currOfferSum = this.getOfferSumValue(currOffer);		
			let currIndex = this.getOfferIndex(currOffer, this.possibleOffers);
			if (currIndex !== -1){
				let currEnemyOffer = this.getEnemyOffer(currOffer);
				let currAverageEnemyValue = this.getAverageEnemyValue(currEnemyOffer, this.possibleEnemyValues);

				if (this.possibleEnemyValues != null && this.possibleEnemyValues.length === 1 && currAverageEnemyValue >= 5){
					if (currAverageEnemyValue + currOfferSum > averageEnemyValue + offerSum){
						index = currIndex;
						averageEnemyValue = currAverageEnemyValue;
						offerSum = currOfferSum;
					}
				}
				else{
					if (currAverageEnemyValue > averageEnemyValue) {
						index = currIndex;
						averageEnemyValue = currAverageEnemyValue;
						offerSum = currOfferSum;
					}
					else if (currAverageEnemyValue == averageEnemyValue && currOfferSum > offerSum) {
						index = currIndex;
						averageEnemyValue = currAverageEnemyValue;
						offerSum = currOfferSum;
					}				
				}
			}			
		}
		return index;
	}

	getNotZeroValuesOffers(){
        let res = [];
        for (let i in this.possibleOffers){
            let po = this.possibleOffers[i];
            let hasZeroValue = false;
            for (let j = 0; j < po.length; ++j){
				if (this.values[j] > 0) continue;
				if (po[j] > 0){
					hasZeroValue = true;
					break
				}
			}
			if (!hasZeroValue) res.push(po);
		}
		return res;
	}

	getNotMaxCountOffers(){
        let res = [];
        let maxCount = this.getMaxCount();
        for (let i in this.possibleOffers){
            let po = this.possibleOffers[i];
            let count = this.getOfferCount(po);
            if (count < maxCount) res.push(po);
		}
		return res;
	}

	getEnemyZeroIndexesOffers(enemyZeroIndexes, possibleOffers){
        let res = [];
        for (let i in possibleOffers){
            let po = possibleOffers[i];

            let needRemove = false;
            for (let j = 0; j < po.length; ++j){
				if (enemyZeroIndexes.includes(j) && po[j] < this.counts[j] && this.values[j] > 0){
					needRemove = true;
					break;
				}
			}

			if (!needRemove){
				res.push(po)
			}			
		}
		return res;
	}

	isSameOffer(offer1, offer2){//предложение противника совпадает с предложением на прошлом шаге		
		for (let i = 0; i < offer1.length; ++i)
			if (offer1[i] !== offer2[i]) return false;
		return true;
	}

	
	updateWrongDetectedZeroPossibleEnemyValues(excludeBigZeroOfferValues){

		this.possibleOffers = this.getPossibleOffersRec(0);	
		this.possibleOffers = this.getNotZeroValuesOffers();
		this.possibleOffers = this.getNotMaxCountOffers();
		this.possibleOffers.sort(comparator(this.values));		

		let possibleEnemyValues = this.getPossibleEnemyValues(this.enemyOffers[1], false, excludeBigZeroOfferValues);
		possibleEnemyValues = this.updatePossibleEnemyValues(this.enemyOffers[1], possibleEnemyValues, this.enemyOffers[0], 0);	

        this.possibleOffers = this.updatePossibleOffersByZeroEnemyValue(this.enemyOffers[1].length, possibleEnemyValues, this.possibleOffers);
		this.possibleOffers = this.removeZeroAverageEnemyValuePossibleOffers(possibleEnemyValues, this.possibleOffers);
		
		for (let i = 0, j = 2; i < this.myOffers.length, j < this.enemyOffers.length; ++i, ++j){
			let newPossibleEnemyValues = this.updatePossibleEnemyValues(this.enemyOffers[j], possibleEnemyValues, this.enemyOffers[j-1], j-1);
            newPossibleEnemyValues = this.updatePossibleEnemyValuesByMyOffer(this.enemyOffers[j], this.myOffers[i], newPossibleEnemyValues);
            if (newPossibleEnemyValues.length === 0)return possibleEnemyValues;//костыль, на случай, если враг рандомит
            possibleEnemyValues = newPossibleEnemyValues;
			this.possibleOffers = this.removeZeroAverageEnemyValuePossibleOffers(possibleEnemyValues, this.possibleOffers);
			//сортировка не нужна - она будет сделана 1 раз при выходе в методе offer()
		}
		return possibleEnemyValues;
	}

	getOfferIndex(offer, offers){
		for (let i = 0; i < offers.length; ++i){
			let currOffer = offers[i];
			let isSame = true;
			for (let j = 0; j < offer.length; ++j){
				if (offer[j] != currOffer[j]){
					isSame = false;
					break;
				}
			}
			if (isSame) return i;
		}
		return -1;
	}

	updatePossibleOffersByZeroEnemyValue(offerLength, possibleEnemyValues, possibleOffers){
		
		let enemyZeroIndexes = [];
		for (let i = 0; i<offerLength; i++){
			let isAlwaysEmemyZero = true;
			for (let j = 0; j < possibleEnemyValues.length;++j){
				let pev = possibleEnemyValues[j];
				if (pev[i] > 0){
					isAlwaysEmemyZero = false;
					break;
				}
			}

			if (isAlwaysEmemyZero){
				//enemy don't need this item. Probably is has zero value for him
				enemyZeroIndexes.push(i);
			}
		}				

		let newPos = this.getEnemyZeroIndexesOffers(enemyZeroIndexes, possibleOffers);				
		return newPos;	
	}

	removeZeroAverageEnemyValuePossibleOffers(possibleEnemyValues, possibleOffers){
		let res = [];

		for (let i = 0; i < possibleOffers.length; ++i){
			let offer = possibleOffers[i];
			let enemyOffer = this.getEnemyOffer(offer);
			let average = this.getAverageEnemyValue(enemyOffer, possibleEnemyValues);
			if (average > 0) res.push(offer);
		}

		if (this.rounds <= 2) return res;

		let isAllPoor = true;
		for(let i = 0; i < res.length; ++i){
			let isPoor = this.isPoorOffer(res[i]);
			if (!isPoor) {
				isAllPoor = false;
				break;
			}
		}
		if (isAllPoor) {
			if (this.log != null) this.log('all left offers are poor');
			return possibleOffers;
		}

		return res;
	}

	getCurrOfferResult(returnBackOfferIndex, enemyOffer, enemyCurrOffer, suggestedSumValue, mySumValue, isCycledOffer){
		let maxSumValue = this.getMaxSumValue();       
		const MIN_MY_SUM_VALUE_TO_REDUCE_OFFER = maxSumValue*0.5 + 1;
		 const MIN_AVERAGE_ENEMY_VALUE = maxSumValue * 0.3;
		 //TODO: возможно, первому игроку надо выставить ненулевую дельту (хотя бы в последнем раунде)

		let DELTA_MAX_SUM_VALUE = maxSumValue * 0.2;
		if (this.possibleEnemyValues != null && this.possibleEnemyValues.length === 1) DELTA_MAX_SUM_VALUE = 0;
		else{
			if (this.isFirstPlayer){
				if (this.rounds >= 4 || this.rounds === 1) DELTA_MAX_SUM_VALUE = 0;
				else DELTA_MAX_SUM_VALUE = maxSumValue * 0.1;
			}
			else{
				if (this.rounds >= 3) DELTA_MAX_SUM_VALUE = maxSumValue * 0.1;				
			}
		}

		// let DELTA_MAX_SUM_VALUE = this.isFirstPlayer || !this.isFirstPlayer && this.rounds >= 3 ? maxSumValue * 0.1 : maxSumValue * 0.2;
		// if (this.rounds >= 4) DELTA_MAX_SUM_VALUE -= maxSumValue * 0.1;
		

		let returnBackOffer = this.possibleOffers[returnBackOfferIndex];
		let returnBackSumValue = this.getOfferSumValue(returnBackOffer);	//моя выручка с прошлого (отличного от текущего) предложения
		let minEnemyValue = Number.MAX_SAFE_INTEGER; 			//минимальная выручка соперника с текущего предложения
		let maxEnemyValue = 0;									//максимальная выручка соперника с текущего предложения
		let minPrevEnemyValue = Number.MAX_SAFE_INTEGER;		//минимальная выручка соперника с прошлого предложения
		let maxPrevEnemyValue = 0;								//максимальная выручка соперника с прошлого предложения

		let enemyReturnBackOffer = this.getEnemyOffer(returnBackOffer);		//прошлое предложение (если смотреть со стороны соперника)

		let maxEnemyValueWantsNow = 0;							//максимальная выручка, которую может заработать соперник со СВОЕГО предложения

				

		for (let i in this.possibleEnemyValues){
			let pev = this.possibleEnemyValues[i];
			let enemyValue = this.getOfferSumValueWithValues(enemyCurrOffer, pev);
			if (enemyValue < minEnemyValue) minEnemyValue = enemyValue;		
			if (enemyValue > maxEnemyValue) maxEnemyValue = enemyValue;
			let prevEnemyValue = this.getOfferSumValueWithValues(enemyReturnBackOffer, pev);
			if (prevEnemyValue < minPrevEnemyValue) minPrevEnemyValue = prevEnemyValue;
			if (prevEnemyValue > maxPrevEnemyValue) maxPrevEnemyValue = prevEnemyValue;

			let enemyValueWantsNow = this.getOfferSumValueWithValues(enemyOffer, pev);
			if (enemyValueWantsNow > maxEnemyValueWantsNow) maxEnemyValueWantsNow = enemyValueWantsNow;

			if (this.log !== null) this.log(`${pev} sugg now: ${enemyValue} sugg prev: ${prevEnemyValue} prev index: ${returnBackOfferIndex} wants now: ${enemyValueWantsNow}`);
		}			
		
		//Мое текущее предложение уменьшает максимальную суммарную выручку игроков (по сравнению с текущим предложением соперника)
		if (suggestedSumValue + maxEnemyValueWantsNow > mySumValue + maxEnemyValue){				
			if (suggestedSumValue >= maxEnemyValueWantsNow){//я заработаю не меньше соперника
				if (this.isFirstPlayer && this.rounds === 1 || !this.isFirstPlayer && this.rounds <= 2) {
					if (this.log !== null) this.log(`fair deal ${suggestedSumValue + maxEnemyValueWantsNow} > ${mySumValue + maxEnemyValue}`);
					return 'accept';
				}
				else if (suggestedSumValue >= mySumValue) {
					if (this.log !== null) this.log(`fair deal. But we have a lot of time. What about my previous offer?`);
					return 'back';
					
				}
			}
		}

		//минимальная суммарная выручка с прошлого предложения была >= минимальной суммарной выручке с этого				
		if (returnBackSumValue + minPrevEnemyValue >= mySumValue + minEnemyValue){
			if (returnBackSumValue != mySumValue || minPrevEnemyValue != minEnemyValue)//если все одинаково, можно сделать это предложение
				if (mySumValue <= minPrevEnemyValue){//моя выручка c этого предложения не больше, чем минимальная выручка соперника с прошлого предложения
					//т.о. максимизируем суммарную выручку и зарабатываем не меньше соперника						
					if (this.log !== null) this.log(`previous offer (min) ${returnBackSumValue + minPrevEnemyValue} >= ${mySumValue + minEnemyValue}`);
					return 'back';			
				}
		}
		

		//TODO: очень агрессивная политика, может отпугнуть соперника
		//особенно, если есть вариант, когда при текущем предложении, он получит 0
		
		//if (minEnemyValue >= MIN_AVERAGE_ENEMY_VALUE) {//TODO: очень странный критерий
			if (isCycledOffer){
				if (this.log != null) this.log(`is cycled offer`);
			}
			else{
				let averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer, this.possibleEnemyValues);
				let averageEnemyPrevValue = this.getAverageEnemyValue(enemyReturnBackOffer, this.possibleEnemyValues);
				if (averageEnemyPrevValue >= MIN_AVERAGE_ENEMY_VALUE && 
					averageEnemyValue >= averageEnemyPrevValue && //мы хотим его рассмотреть этот вариант, хотя он менее выгодный
					returnBackSumValue + averageEnemyPrevValue - DELTA_MAX_SUM_VALUE > mySumValue + averageEnemyValue) {
					if (this.log !== null) this.log(`previous offer (max sum value) 
					${returnBackSumValue + averageEnemyPrevValue } - ${DELTA_MAX_SUM_VALUE} > ${mySumValue + averageEnemyValue}`);
					return 'back';
				}
			}
		//}		

		return 'forward';
	}

	getMinEnemyValue(enemyOffer, possibleEnemyValues){
		return getMinEnemyValue(enemyOffer, possibleEnemyValues);
	}

	getMaxEnemyValue(enemyOffer, possibleEnemyValues){
		return getMaxEnemyValue(enemyOffer, possibleEnemyValues);
	}

	isPossiblyBetterOffer(enemyOffer){
		let maxValue = this.getMaxEnemyValue(enemyOffer, this.possibleEnemyValues);	
		
		for (let i = 0; i < this.myOffers.length; ++i){
			let myOffer = this.myOffers[i];
			let currEnemyOffer = this.getEnemyOffer(myOffer);
			let currMinValue = this.getMinEnemyValue(currEnemyOffer, this.possibleEnemyValues);
			//this.log(`${enemyOffer} max ${maxValue} min ${currMinValue}`)
			if (currMinValue >= maxValue) return false;
		}		
		
		return true;
	}
	
    offer(o){		
        let i;        

        let suggestedSumValue = 0;
        let enemyOffer = null;

        let maxSumValue = this.getMaxSumValue();		
		const MIN_SUGGESTED_VALUE_TO_ACCEPT_OFFER = maxSumValue * 0.8;
		const MIN_AVERAGE_ENEMY_VALUE = maxSumValue * 0.3;

		if (this.log !== null) this.log(`${this.rounds} rounds left`);

        //let prevOfferIndex = this.getPreviosOfferIndex();
        let isSameEnemyOffer = false;
        if (o)
        {
			enemyOffer = this.getEnemyOffer(o);			
            if (this.possibleEnemyValues == null){
				this.possibleEnemyValues = this.getPossibleEnemyValues(enemyOffer, true, true);				
			}
			
			this.possibleEnemyValues = this.updatePossibleEnemyValues(
				enemyOffer, this.possibleEnemyValues, this.enemyOffers[this.enemyOffers.length - 1], this.enemyOffers.length - 1);
			
			if (this.myOffers.length > 0)
				this.possibleEnemyValues = this.updatePossibleEnemyValuesByMyOffer(enemyOffer, this.myOffers[this.myOffers.length - 1], this.possibleEnemyValues);
			

			this.enemyOffers.push(enemyOffer);
			if (this.possibleEnemyValues.length == 0){
				if (this.log != null) this.log("no possible enemy offers left. need update");
				this.possibleEnemyValues = this.updateWrongDetectedZeroPossibleEnemyValues(true);	
				if (this.possibleEnemyValues.length === 0){
					this.possibleEnemyValues = this.updateWrongDetectedZeroPossibleEnemyValues(false);	
				}
			}			  
			
			
			isSameEnemyOffer = this.previousEnemyOffer !== null && this.isSameOffer(enemyOffer, this.previousEnemyOffer);
			this.previousEnemyOffer = enemyOffer;

            suggestedSumValue = this.getOfferSumValue(o);
            if (this.log !== null) this.log(`suggested sum value: ${suggestedSumValue}`);

			if (this.myOffers.length > 0 && suggestedSumValue >= this.getOfferSumValue(this.myOffers[this.myOffers.length - 1])) {
				if (this.log !== null) this.log('current enemy offer is not worse that my previous');//TODO: можно не соглашатсья в раннем раунде
                return;
            }
			
			if (this.rounds === this.max_rounds ||
				this.isFirstPlayer && this.rounds === this.max_rounds - 1)
			{
				this.possibleOffers = this.updatePossibleOffersByZeroEnemyValue(o.length, this.possibleEnemyValues, this.possibleOffers);	
			}
			this.possibleOffers = this.removeZeroAverageEnemyValuePossibleOffers(this.possibleEnemyValues, this.possibleOffers);

			this.possibleOffers.sort(comparator(this.values, this.possibleEnemyValues, this.counts, this.myOffers));
			//prevOfferIndex = this.getPreviosOfferIndex();

			if (this.log !== null)
				for (i in this.possibleOffers){		
					let o = this.possibleOffers[i];
					let sum = this.getOfferSumValue(o);
					let enemyOffer = this.getEnemyOffer(o);
					let enemyAverage = this.getAverageEnemyValue(enemyOffer, this.possibleEnemyValues); 			
					this.log(`${this.possibleOffers[i]} ${sum} ${enemyAverage}`);
				}

			if (suggestedSumValue >= MIN_SUGGESTED_VALUE_TO_ACCEPT_OFFER ){
				if (this.isFirstPlayer && this.rounds <= 2 || !this.isFirstPlayer && this.rounds <= 3) {
                    if (this.log !== null) this.log("MIN_SUGGESTED_VALUE_TO_ACCEPT_OFFER");
                    return;
                }
			}

			if (!this.isFirstPlayer && this.rounds === 1) //I am second and this is the last round
			{
				let sum = 0;
				for (let i = 0; i<o.length; i++)
					sum += this.values[i]*o[i];
				if (sum>0) {
                    if (this.log !== null) this.log("I should accept your offer in last round");
                    return;
                }
			}

        }
		else
		{			
			this.isFirstPlayer = true;
			if (this.log !== null)
				for (i in this.possibleOffers)
					this.log(this.possibleOffers[i]);
		}
		

        
        if (this.log !== null) this.log('');
		
		if (this.possibleEnemyValues != null){
			let str = "";
			for (let i = 0; i < this.possibleEnemyValues.length; ++i)
				str += this.possibleEnemyValues[i] + " / "
			if (this.log !== null) this.log(str);
		}

		let prevOfferIndex = this.getMaxPreviosOfferIndex();
		let returnBackOfferIndex = this.getReturnBackOfferIndex();	
		if (this.log !== null) 
			if (prevOfferIndex >= 0)
				this.log(`max prev offer ${this.possibleOffers[prevOfferIndex]}`);
		if (this.log != null) this.log(`returnBackOfferIndex ${returnBackOfferIndex}`);		

		let currOfferIndex = prevOfferIndex;
		let maxValue = 0;	
		let maxAverageEnemyValue = 0;

		// let prevSumValue = 0;
		// let prevAverageEnemyValue = 0;
		// if (this.possibleEnemyValues != null && prevOfferIndex >= 0){			
		// 	let prevOffer = this.possibleOffers[prevOfferIndex];
		// 	prevSumValue = this.getOfferSumValue(prevOffer);
		// 	let prevEnemyOffer = this.getEnemyOffer(prevOffer);			
		// 	prevAverageEnemyValue = this.getAverageEnemyValue(prevEnemyOffer, this.possibleEnemyValues);
		// }

		let prevOffer = prevOfferIndex >= 0 ? this.possibleOffers[prevOfferIndex] : null;
		let prevSumValue = prevOffer != null ? this.getOfferSumValue(prevOffer) : 0;

		let lastAverageEnemyValue = -1;
		let lastSumValue = -1;
		
		for (let i = prevOfferIndex + 1; i < this.possibleOffers.length; ++i){
			let currOffer = this.possibleOffers[i];
			let offerSumValue = this.getOfferSumValue(currOffer);
			let averageEnemyValue = 0;
			if (this.possibleEnemyValues != null){
				let enemyCurrOffer = this.getEnemyOffer(currOffer);
				averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer, this.possibleEnemyValues); //средняя выручка соперника с моего текущего предложения
				if (averageEnemyValue < MIN_AVERAGE_ENEMY_VALUE) {
					if (this.log != null) this.log(`offer ${currOffer} is too poor for my enemy`);
					lastAverageEnemyValue = averageEnemyValue;
					lastSumValue = offerSumValue;
					continue;
				}
				if (!this.isPossiblyBetterOffer(enemyCurrOffer)){
					if (this.log != null) this.log(`offer ${currOffer} is enemy worse than one of my previous`);
					lastAverageEnemyValue = averageEnemyValue;
					lastSumValue = offerSumValue;
					continue;
				}

				if (prevOffer != null){
					let diffCount = 0;					
					for (let i = 0; i < currOffer.length; ++i){
						let diff = prevOffer[i] - currOffer[i];
						if (diff === 1) {
							for (let j = 0; j < this.possibleEnemyValues.length; ++j){
								let pev = this.possibleEnemyValues[j];
								if (pev[i] === 0) {
									diffCount++;
									break;
								}
							}
						}
					}	
					
					if (offerSumValue < prevSumValue && diffCount == 1){
						if (this.log != null) this.log(`offer ${currOffer} is worse and possible loose value`);
						lastAverageEnemyValue = averageEnemyValue;
						lastSumValue = offerSumValue;
						continue;
					}

				}

				
				if (this.possibleEnemyValues.length == 1){//случай, когда точно знаем цены соперника				
					if (offerSumValue < lastSumValue && averageEnemyValue === lastAverageEnemyValue){
						if (this.log != null) this.log(`offer ${currOffer} has the same average anamy value as previous`);
						lastAverageEnemyValue = averageEnemyValue;
						lastSumValue = offerSumValue;
						continue;
					}
					
				}
			}
			
			if (offerSumValue > maxValue){
				currOfferIndex = i;
				maxValue = offerSumValue;		
				maxAverageEnemyValue = averageEnemyValue;		
			}
			else if (offerSumValue == maxValue && averageEnemyValue > maxAverageEnemyValue){
				currOfferIndex = i;
				maxValue = offerSumValue;	
				maxAverageEnemyValue = averageEnemyValue;	
			}
			lastAverageEnemyValue = averageEnemyValue;
			lastSumValue = offerSumValue;
		}		
		
		
		let currOffer = this.possibleOffers[currOfferIndex];
		let mySumValue = this.getOfferSumValue(this.possibleOffers[currOfferIndex]);	
		if (this.log !== null) this.log(`curr offer: ${currOffer} (${mySumValue})`);

		let isBadOffer = this.isZeroOffer(currOffer) || this.isTooPoorOffer(currOffer);
		let isCycledOffer = this.isCycledOffer(returnBackOfferIndex);
	
		if (isBadOffer){
			currOfferIndex = returnBackOfferIndex;
			if (this.log !== null) this.log('is too poor offer');
		}
		else {
			let isPoorOffer = this.isPoorOffer(currOffer);
			if (isPoorOffer && !isCycledOffer){
				currOfferIndex = returnBackOfferIndex;
				if (this.log !== null) this.log('is poor offer');
			}
			else {

				let isEnemyBestOffer = this.isEnemyBestOffer(currOffer);
				if (isEnemyBestOffer){
                    currOfferIndex = returnBackOfferIndex;
                    if (this.log !== null) this.log('is enemy best offer');
				}
				else {
                    let enemyCurrOffer = this.getEnemyOffer(currOffer);		//текущее предложение (если смотреть со стороны соперника)

                    if (prevOfferIndex >= 0) {

                        let res = this.getCurrOfferResult(returnBackOfferIndex, enemyOffer, enemyCurrOffer, suggestedSumValue, mySumValue, isCycledOffer);
                        if (res === 'accept') return;
                        if (res === 'back') {                            
							currOfferIndex = returnBackOfferIndex; 
                        }
                        //иначе двигаемся дальше
                    }
                }
			}
		}

        currOffer = this.possibleOffers[currOfferIndex];
        mySumValue = this.getOfferSumValue(currOffer);

        if (suggestedSumValue > 0 && mySumValue <= suggestedSumValue){
			if (this.rounds === 1 || currOfferIndex <= 0){//TODO:возможно, вторым стоит соглашаться, начиная со 2 раунда
				if (this.log !== null) this.log("my next offer is not better for me");
				return;
			}
			else {
				currOfferIndex = returnBackOfferIndex;
				currOffer = this.possibleOffers[currOfferIndex];
				mySumValue = this.getOfferSumValue(currOffer);	
				if (suggestedSumValue > 0 && mySumValue <= suggestedSumValue){
					if (this.log !== null) this.log("my return back offer is not better for me");
					return;
				}

				if (this.log !== null) this.log("Oh, good offer! But we have a lot of time. What about my previous offer?")
			}
		}

		this.rounds--;		

		if (this.log !== null) this.log(`My actual offer ${currOffer} (${mySumValue})`);
		this.myOffers.push(currOffer);
        return currOffer;
	}	

	getAverageEnemyValue(enemyOffer, possibleEnemyValues){
        let res = 0;
        let pevCount = possibleEnemyValues.length;
        for (let i = 0; i < pevCount; ++i){
            let pev = possibleEnemyValues[i];
            res += this.getOfferSumValueWithValues(enemyOffer, pev)
		}
		res /= pevCount;
		return res;
	}
	

	isZeroOffer(o){
		for (let i = 0; i < o.length; ++i)
			if (o[i] > 0)			
				return false;		
		
		return true;
	}

	isCycledOffer(returnBackOfferIndex){
    	if (this.rounds >= 3) return false;//не отлавливаем зацикливание раньше 2 ходов до конца
		const MAX_REPEATING_COUNT_TO_MAKE_POOR_OFFER = 2;
		if (this.isFirstPlayer) return false;
		
		let repeatingCount = 0;
		for (let i = this.myOffers.length - 1; i >= 0; --i){
			if (!this.isSameOffer(this.myOffers[i], this.possibleOffers[returnBackOfferIndex])) break;
			repeatingCount++;
		}
		
		return repeatingCount >= MAX_REPEATING_COUNT_TO_MAKE_POOR_OFFER;		
	}

	isPoorOffer(o){		

		let sumValue = this.getOfferSumValue(o);
		if (this.max_rounds === 5 && this.getMaxSumValue() === 10){
						
			if (this.rounds <= 2){
				if (sumValue < 5) return true;
				return false;
			}
			else{
				if (sumValue < 6) return true;
				return false;
			}
			
		}        
        return sumValue < this.getMaxSumValue() / 2;
	}

	isEnemyBestOffer(o){
    	if (this.possibleEnemyValues == null || this.rounds <= 2) return false;
    	let enemyOffer = this.getEnemyOffer(o);
    	let maxValue = this.getMaxSumValue();
    	return this.getAverageEnemyValue(enemyOffer, this.possibleEnemyValues) === maxValue && this.getOfferSumValue(o) !== maxValue;
	}

	isTooPoorOffer(o){
        let sumValue = this.getOfferSumValue(o);
		return sumValue < this.getMaxSumValue() / 4;
	}

	getMaxSumValue(){
        let sum = 0;
		for (let i = 0; i < this.counts.length; ++i)
			sum += this.counts[i] * this.values[i];
		return sum;
	}
		

	getPossibleOffersRec(index){
        let count = this.counts[index];
        let currRes = [];
		for (let i = 0; i <= count; ++i){
			currRes.push([i]);
		}

		if (index === this.counts.length - 1)
			return currRes;

        let nextRes = this.getPossibleOffersRec(index + 1);
        let res = [];
		for (let i = 0; i < currRes.length; ++i){
			for (let arrI in nextRes){
				res.push(currRes[i].concat(nextRes[arrI]));			
			}			
		}
		return res;
	}
	
	getOfferSumValueWithValues(o, values){
		return getOfferSumValue(o, values);
	}

	getOfferSumValue(o){		
		return getOfferSumValue(o, this.values);
	}

	getOfferCount(o){
        let count = 0;
		for (let i = 0; i < o.length; ++i)
			count += o[i];
		return count;
	}

	getMaxCount(){
		return this.getOfferCount(this.counts);
	}

	getEnemyOffer(offer){
        let enemyOffer = [];
		for (let i = 0; i < offer.length; ++i){
			enemyOffer.push(this.counts[i] - offer[i]);
		}	
		return enemyOffer;
	}

	getPossibleEnemyValues(enemyOffer, setZeroValues, excludeBigZeroOfferValues){
    	let currSumValue = this.getMaxSumValue();
		let possibleEnemyValues = this.getPossibleEnemyValuesRec(enemyOffer, currSumValue, 0);		
		
		if (excludeBigZeroOfferValues)
			possibleEnemyValues = this.excludeBigZeroOfferValues(enemyOffer, possibleEnemyValues, setZeroValues);		
        
		return possibleEnemyValues;
	}

	//метод исключает те ценники соперника, в которых предмет, не запрошенный соперником, имеет большую цену, чем запрошенный предмет
	excludeBigZeroOfferValues(offer, possibleEnemyValues, setZeroValues){
		let res = [];
		for (let i = 0; i < possibleEnemyValues.length; ++i){
			let pev = possibleEnemyValues[i];
			let maxZerovalue = 0;
			let minNotZeroValue = Number.MAX_SAFE_INTEGER;
			for (let j = 0; j < offer.length; ++j){
				if (offer[j] === 0){
					//этой вещи много, она что-то стоит, а соперник не хочет ни одной
					if (setZeroValues && pev[j] > 0 && this.counts[j] > 1) maxZerovalue = Number.MAX_SAFE_INTEGER;
					if (pev[j] > maxZerovalue) maxZerovalue = pev[j];
				}
				else{
					if (pev[j] < minNotZeroValue) minNotZeroValue = pev[j];
				}
			}
			if (minNotZeroValue >= maxZerovalue){
				res.push(pev);
			}
		}
		return res;
	}

	getPossibleEnemyValuesRec(enemyOffer, currSumValue, index){
		
		if (index === enemyOffer.length - 1){				
			if (currSumValue === 0) {
				if (enemyOffer[index] > 0) return null;
				return [0];
			}
			if (currSumValue % this.counts[index] !== 0) return null;
			return [currSumValue / this.counts[index]];
		}

        let variants = [];		
		let i = enemyOffer[index] > 0 ? 1 : 0;
		while (currSumValue - i * this.counts[index] >= 0){
			let nextVariants = this.getPossibleEnemyValuesRec(enemyOffer, currSumValue - i * this.counts[index], index + 1);
			for (let j in nextVariants){
				let nextVariant = nextVariants[j];
				if (nextVariant != null){						
					variants.push([i].concat(nextVariant))
				}
			}
			i++;
		}
		
		
		return variants;
	}

	updatePossibleEnemyValues(enemyOffer, possibleEnemyValues, previousEnemyOffer, lastEnemyOfferIndex){

		let isOfferAlreadyMade = false;
		for (let i = 0; i <= lastEnemyOfferIndex; ++i){
			let isSame = this.isSameOffer(enemyOffer, this.enemyOffers[i]);
			if (isSame){
				if (this.log != null) this.log('This offer is already made. No data update here')
				return possibleEnemyValues;
			}
		}		

		let res = [];
		
		
		
		for (let i = 0; i < possibleEnemyValues.length; ++i){
            let pev = possibleEnemyValues[i];
			let currSum = this.getOfferSumValueWithValues(enemyOffer, pev);
			let prevSum = this.getOfferSumValueWithValues(previousEnemyOffer, pev);	
			
			if (currSum > prevSum) continue;//suggested that enemy try to reduce his offer
			
			let maxReduced = 0;
			let minNotReduced = Number.MAX_SAFE_INTEGER;
			// let hasIncreasedValue = false;

			let hasZeroValueForNonZeroOffer = false;

			for (let j = 0; j < pev.length; ++j){

				if (enemyOffer[j] > 0 && pev[j] === 0){
					hasZeroValueForNonZeroOffer = true;
					break;
				}

				let delta = enemyOffer[j] - previousEnemyOffer[j];
				// if (delta > 0){
				// 	hasIncreasedValue = true;
				// 	break;
				// }

				if (delta < 0){
					if (pev[j] > maxReduced){
						maxReduced = pev[j];
					}					
				}				
				//если для меня товар не имеет ценности, умный противник не будет мне его предлагать
				else if (delta === 0 && pev[j] !== 0 && enemyOffer[j] !== 0 && this.values[j] != 0){
					if (pev[j] < minNotReduced){
						minNotReduced = pev[j];
					}
				}
			}
			
			if (!hasZeroValueForNonZeroOffer && maxReduced <= minNotReduced)			
				res.push(pev);
		}
		return res;
	}
	
	//если соперник делает предложение, которое по данным ценам менее (или столь же) выгодно, чем мое, то отбрасываем данные цены 
	updatePossibleEnemyValuesByMyOffer(enemyOffer, myOffer, possibleEnemyValues){
        let res = [];
        let myEnemyOffer = this.getEnemyOffer(myOffer);
		for (let i = 0; i < possibleEnemyValues.length; ++i){
            let pev = possibleEnemyValues[i];
            let enemyOfferValue = this.getOfferSumValueWithValues(enemyOffer, pev);
            let myEnemyOfferValue = this.getOfferSumValueWithValues(myEnemyOffer, pev);
			if (enemyOfferValue > myEnemyOfferValue){
				res.push(pev)
			}
			else{
				//if (this.log !== null) this.log(`exluced: ${pev}`)
			}
		}
		return res
	}
};

function getOfferSumValue(o, values){
    let sumValue = 0;
	for (let i = 0; i < o.length; ++i){
		sumValue += o[i] * values[i];
	}
	return sumValue;
}


function comparator(values, possibleEnemyValues, counts, myOffers){
	return function(offerA, offerB){
		if (possibleEnemyValues == null){
			let diff = -getOfferSumValue(offerA, values) + getOfferSumValue(offerB, values);
			return diff;
		}        
		
        let aEnemyOffer = getEnemyOffer(offerA,counts);
        let aAverageEnemyValue = getAverageEnemyValue(aEnemyOffer, possibleEnemyValues);
        let bEnemyOffer = getEnemyOffer(offerB, counts);
        let bAverageEnemyOffer = getAverageEnemyValue(bEnemyOffer, possibleEnemyValues);
		let enemyAverageDiff = aAverageEnemyValue - bAverageEnemyOffer;

		if (myOffers == null) return enemyAverageDiff;

		

		let isOfferAMade = myOffers.indexOf(offerA) >= 0;
		let isOfferBMade = myOffers.indexOf(offerB) >= 0;
		if (isOfferAMade && isOfferBMade || !isOfferAMade && !isOfferBMade) return enemyAverageDiff;

		let aMinValue = getMinEnemyValue(aEnemyOffer, possibleEnemyValues);
		let aMaxValue = getMaxEnemyValue(aEnemyOffer, possibleEnemyValues);
		let bMinValue = getMinEnemyValue(bEnemyOffer, possibleEnemyValues);
		let bMaxValue = getMaxEnemyValue(bEnemyOffer, possibleEnemyValues);		

		if (isOfferAMade){
			if (enemyAverageDiff <= 0) return -1;
			if (bMaxValue > aMinValue) return -1;
			return 1;
		}
		else{//isOfferBMade
			if (enemyAverageDiff => 0) return 1;
			if (aMaxValue > bMinValue) return 1;
			return - 1;
		}
		
	}
}

function getAverageEnemyValue(enemyOffer, possibleEnemyValues){
    let res = 0;
    let pevCount = possibleEnemyValues.length;
	for (let i = 0; i < pevCount; ++i){
        let pev = possibleEnemyValues[i];
		res += getOfferSumValue(enemyOffer, pev)
	}
	res /= pevCount;
	return res;
}

function getMinEnemyValue(enemyOffer, possibleEnemyValues){
	let minValue = Number.MAX_SAFE_INTEGER;   
	for (let i = 0; i < possibleEnemyValues.length; ++i){
		let pev = possibleEnemyValues[i];		
		let sum = getOfferSumValue(enemyOffer, pev);
		if (sum < minValue) minValue = sum;
	}	
	return minValue;
}

function getMaxEnemyValue(enemyOffer, possibleEnemyValues){
	let maxValue = 0;   
	for (let i = 0; i < possibleEnemyValues.length; ++i){
		let pev = possibleEnemyValues[i];		
		let sum = getOfferSumValue(enemyOffer, pev);
		if (sum > maxValue) maxValue = sum;
	}	
	return maxValue;
}

function getEnemyOffer(offer, counts){
    let enemyOffer = [];
	for (let i = 0; i < offer.length; ++i){
		enemyOffer.push(counts[i] - offer[i]);
	}	
	return enemyOffer;
}





