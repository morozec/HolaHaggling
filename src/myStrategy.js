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
		this.enemyZeroIndexes = []; 	
				

		this.possibleOffers = this.getPossibleOffersRec(0);	
		this.possibleOffers = this.getNotZeroValuesOffers();
		this.possibleOffers = this.getNotMaxCountOffers();
		this.possibleOffers.sort(comparator(this.values));
		//for (var i in this.possibleOffers)
		//	this.log(this.possibleOffers[i]);		

		this.prevOfferValue = null;
		this.possibleEnemyValues = null;
		this.previousEnemyOffer = null;	

		this.prevOfferIndexes = [];
		
		this.myOffers = [];
		this.enemyOffers = [];
	}

	getPreviosOfferIndex(){

		if (this.prevOfferValue == null) return -1;//no offers yet
		
		for (let i = 0; i < this.possibleOffers.length; ++i){
            let po = this.possibleOffers[i];
            let sumValue = this.getOfferSumValue(po);
            if (sumValue < this.prevOfferValue) return i-1
		}
		return this.possibleOffers.length - 1;
	}

	getReturnBackOfferIndex(){
		
		let poiLength = this.prevOfferIndexes.length;
		if (poiLength == 0) return 0;
		let offer = this.possibleOffers[this.prevOfferIndexes[poiLength - 1]]
		let enemyOffer = this.getEnemyOffer(offer);
		let averageEnemyValue = this.getAverageEnemyValue(enemyOffer);

		

		for (let i = poiLength - 2; i >=0; --i){
			
			let currOffer = this.possibleOffers[this.prevOfferIndexes[i]]			
			let currEnemyOffer = this.getEnemyOffer(currOffer);
			let currAverageEnemyValue = this.getAverageEnemyValue(currEnemyOffer);
			if (currAverageEnemyValue < averageEnemyValue) return this.prevOfferIndexes[i + 1];
		}
		return this.prevOfferIndexes[0];
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

	getEnemyZeroIndexesOffers(){
        let res = [];
        for (let i in this.possibleOffers){
            let po = this.possibleOffers[i];

            let needRemove = false;
            for (let j = 0; j < po.length; ++j){
				if (this.enemyZeroIndexes.includes(j) && po[j] < this.counts[j] && this.values[j] > 0){
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

	isSameEnemyOffer(enemyOffer){
		if (this.previousEnemyOffer == null) return false;
		for (let i = 0; i < enemyOffer.length; ++i)
			if (enemyOffer[i] !== this.previousEnemyOffer[i]) return false;
		return true;
	}

	updatePreviousOfferIndexes(newPossibleOffers){
    	let res = [];
    	for (let i = 0; i < this.prevOfferIndexes.length; ++i){
    		let poi = this.prevOfferIndexes[i];
    		let po = this.possibleOffers[poi];

    		for (let j = 0; j < newPossibleOffers.length; ++j){
    			let newPo = newPossibleOffers[j];
    			let isSameOffer = true;
    			for (let k = 0; k < newPo.length; ++k){
    				if (po[k] !== newPo[k]){
    					isSameOffer = false;
    					break;
					}
				}
				if (isSameOffer){				
					
    				res.push(j);
    				break;
				}
			}
		}
		return res;
	}

	updateWrongDetectedZeroPossibleEnemyValues(enemyOffer){
		let possibleEnemyValues = this.getPossibleEnemyValues(this.enemyOffers[0], false);	
		
		for (let i = 0, j = 1; i < this.myOffers.length, j < this.enemyOffers.length; ++i, ++j){					
			possibleEnemyValues = this.updatePossibleEnemyValues(this.enemyOffers[j], possibleEnemyValues, this.enemyOffers[j-1]);			
			possibleEnemyValues = this.updatePossibleEnemyValuesByMyOffer(this.enemyOffers[j], this.myOffers[i], possibleEnemyValues);			
		}
		return possibleEnemyValues;
	}
	
    offer(o){
		let mySumValue;
        let i;
        let currOffer;

        let suggestedSumValue = 0;
        let enemyOffer = null;

        let maxSumValue = this.getMaxSumValue();
        const MIN_AVERAGE_ENEMY_VALUE = maxSumValue * 0.3;
		const MIN_MY_SUM_VALUE_TO_REDUCE_OFFER = maxSumValue*0.5 + 1;
		const MIN_SUGGESTED_VALUE_TO_ACCEPT_OFFER = maxSumValue * 0.8;

		if (this.log !== null) this.log(`${this.rounds} rounds left`);

        let prevOfferIndex = this.getPreviosOfferIndex();
        let isSameEnemyOffer = false;
        if (o)
        {
			enemyOffer = this.getEnemyOffer(o);			
            if (this.possibleEnemyValues == null){
				this.possibleEnemyValues = this.getPossibleEnemyValues(enemyOffer, true);				
			}
			else{
				this.possibleEnemyValues = this.updatePossibleEnemyValues(enemyOffer, this.possibleEnemyValues, this.enemyOffers[this.enemyOffers.length - 1]);
			}
			if (this.myOffers.length > 0)
				this.possibleEnemyValues = this.updatePossibleEnemyValuesByMyOffer(enemyOffer, this.myOffers[this.myOffers.length - 1], this.possibleEnemyValues);

			this.enemyOffers.push(enemyOffer);
			if (this.possibleEnemyValues.length == 0){
				if (this.log != null) this.log("no possible enemy offers left. need update");
				this.possibleEnemyValues = this.updateWrongDetectedZeroPossibleEnemyValues();	
			}			  
			
			
			isSameEnemyOffer = this.isSameEnemyOffer(enemyOffer);
			this.previousEnemyOffer = enemyOffer;

            suggestedSumValue = this.getOfferSumValue(o);
            if (this.log !== null) this.log(`suggested sum value: ${suggestedSumValue}`);

			if (prevOfferIndex >= 0 && suggestedSumValue >= this.getOfferSumValue(this.possibleOffers[prevOfferIndex])) {
				if (this.log !== null) this.log('current enemy offer is not worse that my previous');//TODO: можно не соглашатсья в раннем раунде
                return;
            }
			
			if (this.rounds === this.max_rounds ||
				this.isFirstPlayer && this.rounds === this.max_rounds - 1)
			{
				for (let i = 0; i<o.length; i++){
					let isAlwaysEmemyZero = true;
					for (let j = 0; j < this.possibleEnemyValues.length;++j){
						let pev = this.possibleEnemyValues[j];
						if (pev[i] > 0){
							isAlwaysEmemyZero = false;
							break;
						}
					}

					if (isAlwaysEmemyZero){
						//enemy don't need this item. Probably is has zero value for him
						this.enemyZeroIndexes.push(i);
					}
				}				

				let newPos = this.getEnemyZeroIndexesOffers();
				let newPois =  this.updatePreviousOfferIndexes(newPos);				
				this.prevOfferIndexes = newPois;
				this.possibleOffers = newPos;
				//for (var i in this.possibleOffers)
				//	this.log(this.possibleOffers[i]);
			}

			this.possibleOffers.sort(comparator(this.values, this.possibleEnemyValues, this.counts));
			prevOfferIndex = this.getPreviosOfferIndex();

			if (this.log !== null)
				for (i in this.possibleOffers)
					this.log(this.possibleOffers[i]);

			if (suggestedSumValue >= MIN_SUGGESTED_VALUE_TO_ACCEPT_OFFER){

                if (this.log !== null) this.log("MIN_SUGGESTED_VALUE_TO_ACCEPT_OFFER");
                return;
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


        let currOfferIndex = prevOfferIndex;
        if (this.log !== null) this.log('');
		if (this.log !== null) this.log(`prev offer indexes: ${this.prevOfferIndexes}`);
		if (this.possibleEnemyValues != null)
			for (let i = 0; i < this.possibleEnemyValues.length; ++i)
				if (this.log !== null) this.log(this.possibleEnemyValues[i]);

		let returnBackOfferIndex = this.getReturnBackOfferIndex();		

		let poorEnemyOfferIndex = -1;
		while (currOfferIndex < this.possibleOffers.length - 1){
			currOfferIndex++;
			if (this.prevOfferIndexes.indexOf(currOfferIndex) >= 0) continue;			

            currOffer = this.possibleOffers[currOfferIndex];
            mySumValue = this.getOfferSumValue(currOffer);
			if (this.log !== null) this.log(`curr offer: ${currOffer} (${mySumValue})`);
			
			
			if (currOfferIndex < this.possibleOffers.length - 1 && 
				mySumValue === this.getOfferSumValue(this.possibleOffers[currOfferIndex + 1])) {
				if (this.log !== null) this.log(`the same my sum value ${mySumValue}`);
				continue
			}

			//if current offer if zero value for me or too cheap, suggest preveous one		
            let isBadOffer = this.isZeroOffer(currOffer) || this.isTooPoorOffer(currOffer);
            if (isBadOffer){
				currOfferIndex = poorEnemyOfferIndex >-1 ? poorEnemyOfferIndex : returnBackOfferIndex;
				if (this.log !== null) this.log('is too poor offer');
				break				
			}

            let isPoorOffer = this.isPoorOffer(currOffer);
            if (isPoorOffer){
                let needMakePoorOffer = !this.isFirstPlayer && isSameEnemyOffer;
                if (!needMakePoorOffer){
					currOfferIndex = poorEnemyOfferIndex > -1 ? poorEnemyOfferIndex : returnBackOfferIndex;
					if (this.log !== null) this.log('is poor offer');
					break
				}
			}			

			currOffer = this.possibleOffers[currOfferIndex];


            let enemyCurrOffer = this.getEnemyOffer(currOffer);		//текущее предложение (если смотреть со стороны соперника)

			if (prevOfferIndex >= 0){

                let prevOffer = this.possibleOffers[prevOfferIndex];
                let myPrevSumValue = this.getOfferSumValue(prevOffer);	//моя выручка с прошлого (отличного от текущего) предложения
                let minEnemyValue = Number.MAX_SAFE_INTEGER; 			//минимальная выручка соперника с текущего предложения
                let maxEnemyValue = 0;									//максимальная выручка соперника с текущего предложения
                let minPrevEnemyValue = Number.MAX_SAFE_INTEGER;		//минимальная выручка соперника с прошлого предложения
                let maxPrevEnemyValue = 0;								//максимальная выручка соперника с прошлого предложения

                let enemyPrevOffer = this.getEnemyOffer(prevOffer);		//прошлое предложение (если смотреть со стороны соперника)

                let maxEnemyValueWantsNow = 0;							//максимальная выручка, которую может заработать соперник со СВОЕГО предложения

						

				for (i in this.possibleEnemyValues){
                    let pev = this.possibleEnemyValues[i];
                    let enemyValue = this.getOfferSumValueWithValues(enemyCurrOffer, pev);
					if (enemyValue < minEnemyValue) minEnemyValue = enemyValue;		
					if (enemyValue < maxEnemyValue) maxEnemyValue = enemyValue;
                    let prevEnemyValue = this.getOfferSumValueWithValues(enemyPrevOffer, pev);
					if (prevEnemyValue < minPrevEnemyValue) minPrevEnemyValue = prevEnemyValue;
					if (prevEnemyValue > maxPrevEnemyValue) maxPrevEnemyValue = prevEnemyValue;

                    let enemyValueWantsNow = this.getOfferSumValueWithValues(enemyOffer, pev);
					if (enemyValueWantsNow > maxEnemyValueWantsNow) maxEnemyValueWantsNow = enemyValueWantsNow;

					if (this.log !== null) this.log(`${pev} sugg now: ${enemyValue} sugg prev: ${prevEnemyValue} wants now: ${enemyValueWantsNow}`);
				}			
				
				//Мое текущее предложение уменьшает максимальную суммарную выручку игроков (по сравнению с текущим предложением соперника)
				if (suggestedSumValue + maxEnemyValueWantsNow > mySumValue + maxEnemyValue){				
					if (suggestedSumValue >= maxEnemyValueWantsNow){//я заработаю не меньше соперника
						if (this.isFirstPlayer && this.rounds === 1 || !this.isFirstPlayer && this.rounds <= 2) {
                            if (this.log !== null) this.log(`fair deal`);
                            return;
                        }
                        else{
                            if (this.log !== null) this.log(`fair deal. But we have a lot of time. What about my previous offer?`);
                            currOfferIndex = returnBackOfferIndex;
                            break
						}
					}
				}

				//минимальная суммарная выручка с прошлого предложения была >= минимальной суммарной выручке с этого
				if (myPrevSumValue + minPrevEnemyValue >= mySumValue + minEnemyValue){
					if (mySumValue <= minPrevEnemyValue){//моя выручка c этого предложения не больше, чем минимальная выручка соперника с прошлого предложения
						//т.о. максимизируем суммарную выручку и зарабатываем не меньше соперника						
						if (this.log !== null) this.log('previous offer (min)');
						currOfferIndex = returnBackOfferIndex;
						break
					}
				}				
				if (minEnemyValue >= MIN_AVERAGE_ENEMY_VALUE)
					if (this.isFirstPlayer || mySumValue < MIN_MY_SUM_VALUE_TO_REDUCE_OFFER){//если я первый игрок или моя выручка достаточно снижена, играем агрессивно
						let averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer);
						let averageEnemyPrevValue = this.getAverageEnemyValue(enemyPrevOffer);
						if (myPrevSumValue + averageEnemyPrevValue > mySumValue + averageEnemyValue){
							if (this.log !== null) this.log('previous offer (max sum value)');
							currOfferIndex = returnBackOfferIndex;
							break
						}
					}
			}
			if (this.possibleEnemyValues != null){//null на 1 шаге 1 игрока
				//мое текущее предложение достаточно выгодно для соперника
				//нет смысла дальше его уменьшать
                let averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer); //средняя выручка соперника с моего текущего предложения
                if (averageEnemyValue >= MIN_AVERAGE_ENEMY_VALUE) {
					// if (prevOfferIndex >= 0){
					// 	let prevOffer = this.possibleOffers[prevOfferIndex];
					// 	let enemyPrevOffer = this.getEnemyOffer(prevOffer);
					// 	if (averageEnemyValue >= this.getAverageEnemyValue(enemyPrevOffer)){
					// 		this.log(`current average enemy value is not less than previous`);
					// 	}
					// 	else break;						
					// }
					// else break;
					break;
				}
				else {
					if (this.log != null) this.log(`too bad for my enemy ${averageEnemyValue}`);
					poorEnemyOfferIndex = currOfferIndex;
				}
			}	
			else{				
				break
			}
		}


        currOffer = this.possibleOffers[currOfferIndex];
        mySumValue = this.getOfferSumValue(currOffer);

        if (suggestedSumValue > 0 && mySumValue <= suggestedSumValue){
			if (this.rounds === 1 || currOfferIndex <= 0){
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

		this.prevOfferValue = mySumValue;	
		this.prevOfferIndexes.push(currOfferIndex);
		this.rounds--;		

		if (this.log !== null) this.log(`My actual offer ${currOffer} (${mySumValue})`);
		this.myOffers.push(currOffer);
        return currOffer;
	}	

	getAverageEnemyValue(offer){
        let res = 0;
        let pevCount = this.possibleEnemyValues.length;
        for (let i = 0; i < pevCount; ++i){
            let pev = this.possibleEnemyValues[i];
            res += this.getOfferSumValueWithValues(offer, pev)
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

	getPossibleEnemyValues(enemyOffer, notZeroIndexes, setZeroValues){
    	let currSumValue = this.getMaxSumValue();
		let possibleEnemyValues = this.getPossibleEnemyValuesRec(enemyOffer, currSumValue, 0);
		possibleEnemyValues = this.excludeBigZeroOfferValues(enemyOffer, possibleEnemyValues, notZeroIndexes, setZeroValues);
        // if (possibleEnemyValues.length === 0)
        // 	possibleEnemyValues = this.getPossibleEnemyValuesRec(enemyOffer, currSumValue, 0, 1);
		return possibleEnemyValues;
	}

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

	getPossibleEnemyValuesRec(offer, currSumValue, index){
		
		if (index === offer.length - 1){			
			if (currSumValue === 0) return [0];
			if (currSumValue % this.counts[index] !== 0) return null;
			return [currSumValue / this.counts[index]];
		}

        let variants = [];		
		let i = 0;
		while (currSumValue - i * this.counts[index] >= 0){
			let nextVariants = this.getPossibleEnemyValuesRec(offer, currSumValue - i * this.counts[index], index + 1);
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

	updatePossibleEnemyValues(enemyOffer, possibleEnemyValues, previousEnemyOffer){
        let res = [];
		
		for (let i = 0; i < possibleEnemyValues.length; ++i){
            let pev = possibleEnemyValues[i];

            let maxReduced = 0;
            let minNotReduced = Number.MAX_SAFE_INTEGER;
			for (let j = 0; j < pev.length; ++j){

                let delta = enemyOffer[j] - previousEnemyOffer;

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
			if (maxReduced <= minNotReduced){
				res.push(pev);
			}
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
				if (this.log !== null) this.log(`exluced: ${pev}`)
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


function comparator(values, possibleEnemyValues, counts){
	return function(offerA, offerB){
        let diff = -getOfferSumValue(offerA, values) + getOfferSumValue(offerB, values);
		if (diff !== 0 || possibleEnemyValues == null) return diff;
        let aEnemyOffer = getEnemyOffer(offerA,counts);
        let aAverageEnemyValue = getAverageEnemyValue(aEnemyOffer, possibleEnemyValues);
        let bEnemyOffer = getEnemyOffer(offerB, counts);
        let bAverageEnemyOffer = getAverageEnemyValue(bEnemyOffer, possibleEnemyValues);
		return aAverageEnemyValue - bAverageEnemyOffer
	}
}

module.exports.comparator = comparator

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

function getEnemyOffer(offer, counts){
    let enemyOffer = [];
	for (let i = 0; i < offer.length; ++i){
		enemyOffer.push(counts[i] - offer[i]);
	}	
	return enemyOffer;
}





