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
		
	}

	getPreviosOfferIndex(){

		if (this.prevOfferValue == null) return -1;//no offers yet
		
		for (let i = 1; i < this.possibleOffers.length; ++i){
            let po = this.possibleOffers[i];
            let sumValue = this.getOfferSumValue(po);
            if (sumValue < this.prevOfferValue) return i-1
		}
		return this.possibleOffers.length - 1;
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
            let count = Agent.getOfferCount(po);
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
	
    offer(o){
		let mySumValue;
        let i;
        let suggestedSumValue = this.getOfferSumValue(o);
        let enemyOffer = this.getEnemyOffer(o);
        let currOffer;
        const MIN_AVERAGE_ENEMY_VALUE = 3;
		const MIN_MY_SUM_VALUE_TO_REDUCE_OFFER = this.getMaxSumValue()/2 + 1;

		this.log(`${this.rounds} rounds left`);

        let prevOfferIndex = this.getPreviosOfferIndex();
        let isSameEnemyOffer = false;
        if (o)
        {
            if (this.possibleEnemyValues == null){
				this.possibleEnemyValues = this.getPossibleEnemyValues(enemyOffer);				
			}
			else{
				this.possibleEnemyValues = this.updatePossibleEnemyValues(enemyOffer);
			}
			if (prevOfferIndex >= 0)
				this.possibleEnemyValues = this.updatePossibleEnemyValuesByMyOffer(enemyOffer, this.possibleOffers[prevOfferIndex]);
			
			isSameEnemyOffer = this.isSameEnemyOffer(enemyOffer);
			this.previousEnemyOffer = enemyOffer;

            this.log(`suggested sum value: ${suggestedSumValue}`);

			if (prevOfferIndex >= 0 && suggestedSumValue >= this.getOfferSumValue(this.possibleOffers[prevOfferIndex]))
				return;
			
			if (this.rounds === this.max_rounds ||
				this.isFirstPlayer && this.rounds === this.max_rounds - 1)
			{
				for (let i = 0; i<o.length; i++){
					if (o[i] === this.counts[i]){
						//enemy don't need this item. Probably is has zero value for him
						this.enemyZeroIndexes.push(i);
					}
				}
				this.possibleOffers = this.getEnemyZeroIndexesOffers();
				//for (var i in this.possibleOffers)
				//	this.log(this.possibleOffers[i]);
			}

			this.possibleOffers.sort(comparator(this.values, this.possibleEnemyValues, this.counts));
			prevOfferIndex = this.getPreviosOfferIndex();

			for (i in this.possibleOffers)
				this.log(this.possibleOffers[i]);
			

			if (!this.isFirstPlayer && this.rounds === 1) //I am second and this is the last round
			{
				let sum = 0;
				for (let i = 0; i<o.length; i++)
					sum += this.values[i]*o[i];
				if (sum>0)
					return;
			}
        }
		else
		{			
			this.isFirstPlayer = true;
			for (i in this.possibleOffers)
				this.log(this.possibleOffers[i]);
		}


        let currOfferIndex = prevOfferIndex;
        this.log('');
		this.log(prevOfferIndex);
		while (currOfferIndex < this.possibleOffers.length - 1){
			currOfferIndex++;

            currOffer = this.possibleOffers[currOfferIndex];
            mySumValue = this.getOfferSumValue(currOffer);
			this.log(`curr offer: ${currOffer} (${mySumValue})`);
			
			
			if (currOfferIndex < this.possibleOffers.length - 1 && 
				mySumValue === this.getOfferSumValue(this.possibleOffers[currOfferIndex + 1])) {
				this.log(`the same my sum value ${mySumValue}`);
				continue
			}
			
			//if current offer if zero value for me or too cheap, suggest preveous one		
            let isBadOffer = Agent.isZeroOffer(currOffer) || this.isTooPoorOffer(currOffer);
            if (isBadOffer){
				currOfferIndex = prevOfferIndex > 0 ? prevOfferIndex : 0;
				this.log('is too poor offer');
				break				
			}

            let isPoorOffer = this.isPoorOffer(currOffer);
            if (isPoorOffer){
                let needMakePoorOffer = !this.isFirstPlayer && isSameEnemyOffer;
                if (!needMakePoorOffer){
					currOfferIndex = prevOfferIndex > 0 ? prevOfferIndex : 0;
					this.log('is poor offer');
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
                let maxPrevenemyValue = 0;								//максимальная выручка соперника с прошлого предложения

                let enemyPrevOffer = this.getEnemyOffer(prevOffer);		//прошлое предложение (если смотреть со стороны соперника)

                let maxEnemyValueWantsNow = 0;							//максимальная выручка, которую может заработать соперник со СВОЕГО предложения

						

				for (i in this.possibleEnemyValues){
                    let pev = this.possibleEnemyValues[i];
                    let enemyValue = Agent.getOfferSumValueWithValues(enemyCurrOffer, pev);
					if (enemyValue < minEnemyValue) minEnemyValue = enemyValue;		
					if (enemyValue < maxEnemyValue) maxEnemyValue = enemyValue;
                    let prevEnemyValue = Agent.getOfferSumValueWithValues(enemyPrevOffer, pev);
					if (prevEnemyValue < minPrevEnemyValue) minPrevEnemyValue = prevEnemyValue;
					if (prevEnemyValue > maxPrevenemyValue) maxPrevenemyValue = prevEnemyValue;

                    let enemyValueWantsNow = Agent.getOfferSumValueWithValues(enemyOffer, pev);
					if (enemyValueWantsNow > maxEnemyValueWantsNow) maxEnemyValueWantsNow = enemyValueWantsNow;

					this.log(`${pev} sugg now: ${enemyValue} sugg prev: ${prevEnemyValue} wants now: ${enemyValueWantsNow}`);
				}			
				
				//Мое текущее предложение уменьшает максимальную суммарную выручку игроков (по сравнению с текущим предложением соперника)
				if (suggestedSumValue + maxEnemyValueWantsNow > mySumValue + maxEnemyValue){				
					if (suggestedSumValue >= maxEnemyValueWantsNow){//я заработаю не меньше соперника
						this.log(`fair deal`);
						return;
					}
				}

				//минимальная суммарная выручка с прошлого предложения была >= минимальной суммарной выручке с этого
				if (myPrevSumValue + minPrevEnemyValue >= mySumValue + minEnemyValue){
					if (mySumValue <= minPrevEnemyValue){//моя выручка c этого предложения не больше, чем минимальная выручка соперника с прошлого предложения
						//т.о. максимизируем суммарную выручку и зарабатываем не меньше соперника						
						this.log('previous offer (min)');
						currOfferIndex = prevOfferIndex > 0 ? prevOfferIndex : 0;
						break
					}
				}				
				
				if (this.isFirstPlayer || mySumValue < MIN_MY_SUM_VALUE_TO_REDUCE_OFFER){//если я первый игрок или моя выручка достаточно снижена, играем агрессивно
                    let averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer);
                    let averageEnemyPrevValue = this.getAverageEnemyValue(enemyPrevOffer);
					if (myPrevSumValue + averageEnemyPrevValue > mySumValue + averageEnemyValue){
						this.log('previous offer (max sum value)');
						currOfferIndex = prevOfferIndex > 0 ? prevOfferIndex : 0;
						break
					}
				}
				

				/*
				//максимальная суммарная выручка с прошлого предложения больше, чем минимальная на этом
				//TODO: спорно. невыгодно для соперника
				if (myPrevSumValue + maxPrevenemyValue > mySumValue + minEnemyValue){
					if (minPrevEnemyValue > 0){//противник гарантированно получит что-то с прошлого предложения
						if (mySumValue < myPrevSumValue){//моя выручка с прошлого предложения была выше, чем с этого
							this.rounds--;						
							this.log('previous offer (max)')
							return prevOffer;
						}
					}
				}
				*/

				
			}
			/*
			else if (this.possibleEnemyValues != null){//just log
				var enemyCurrOffer = this.getEnemyOffer(currOffer);		//текущее предложение (если смотреть со стороны соперника)

				for (var i in this.possibleEnemyValues){
					var pev = this.possibleEnemyValues[i]; 				
					var enemyValue = this.getOfferSumValueWithValues(enemyCurrOffer, pev)
					this.log(`${pev} sugg now: ${enemyValue}`);
				}		
			}
			*/				
			if (this.possibleEnemyValues != null){//null на 1 шаге 1 игрока
                let averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer); //средняя выручка соперника с моего текущего предложения
				//мое текущее предложение достаточно выгодно для соперника
				//нет смысла дальше его уменьшать	
				if (averageEnemyValue >= MIN_AVERAGE_ENEMY_VALUE) break;	
				else this.log(`to bad for my enemy ${averageEnemyValue}`)	
			}	
			else{
				break
			}
		}


        currOffer = this.possibleOffers[currOfferIndex];
        mySumValue = this.getOfferSumValue(currOffer);

        if (suggestedSumValue && mySumValue <= suggestedSumValue){
			if (this.isFirstPlayer && this.rounds === 1 || !this.isFirstPlayer && this.rounds <= 2 || currOfferIndex <= 0){
				this.log("my next offer is not better for me");
				return;
			}
			else {
				currOfferIndex = prevOfferIndex > 0 ? prevOfferIndex : 0;
				currOffer = this.possibleOffers[currOfferIndex];
				mySumValue = this.getOfferSumValue(currOffer);	
				this.log("Oh, good offer! But we have a lot of time. What about my previous offer?")
			}
		}

		this.prevOfferValue = mySumValue;	
		this.rounds--;		

        return currOffer;
	}

	getAverageEnemyValue(offer){
        let res = 0;
        let pevCount = this.possibleEnemyValues.length;
        for (let i = 0; i < pevCount; ++i){
            let pev = this.possibleEnemyValues[i];
            res += Agent.getOfferSumValueWithValues(offer, pev)
		}
		res /= pevCount;
		return res;
	}
	

	static isZeroOffer(o){
		for (let i = 0; i < o.length; ++i)
			if (o[i] > 0)			
				return false;		
		
		return true;
	}

	isPoorOffer(o){
        let sumValue = this.getOfferSumValue(o);
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
	
	static getOfferSumValueWithValues(o, values){
		return getOfferSumValue(o, values);
	}

	getOfferSumValue(o){		
		return getOfferSumValue(o, this.values);
	}

	static getOfferCount(o){
        let count = 0;
		for (let i = 0; i < o.length; ++i)
			count += o[i];
		return count;
	}

	getMaxCount(){
		return Agent.getOfferCount(this.counts);
	}

	getEnemyOffer(offer){
        let enemyOffer = [];
		for (let i = 0; i < offer.length; ++i){
			enemyOffer.push(this.counts[i] - offer[i]);
		}	
		return enemyOffer;
	}

	getPossibleEnemyValues(enemyOffer){
        let possibleEnemyValues = this.getPossibleEnemyValuesRec(enemyOffer, this.getMaxSumValue(), 0);
		return possibleEnemyValues;
	}

	getPossibleEnemyValuesRec(offer, currSumValue, index){	
		
		if (index === offer.length - 1){
			if (offer[index] === 0){
				if (currSumValue === 0) return [0];
				else return null;
			}
			if (currSumValue === 0) return null;
			if (currSumValue % this.counts[index] !== 0) return null;
			return [currSumValue / this.counts[index]];
		}

        let variants = [];
		if (offer[index] === 0){
			let nextVariants = this.getPossibleEnemyValuesRec(offer, currSumValue, index + 1);
			for (let i in nextVariants){
                let nextVariant = nextVariants[i];
				if (nextVariant != null)
					variants.push([0].concat(nextVariant))
			}
		}
		else{

            let i = 1;
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
		}
		
		return variants;
	}

	updatePossibleEnemyValues(enemyOffer){
        let res = [];
		
		for (let i = 0; i < this.possibleEnemyValues.length; ++i){
            let pev = this.possibleEnemyValues[i];

            let maxReduced = 0;
            let minNotReduced = Number.MAX_SAFE_INTEGER;
			for (let j = 0; j < pev.length; ++j){

                let delta = enemyOffer[j] - this.previousEnemyOffer[j];

				if (delta < 0){
					if (pev[j] > maxReduced){
						maxReduced = pev[j];
					}					
				}
				else if (delta === 0 && pev[j] !== 0){
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
	updatePossibleEnemyValuesByMyOffer(enemyOffer, myOffer){
        let res = [];
        let myEnemyOffer = this.getEnemyOffer(myOffer);
		for (let i = 0; i < this.possibleEnemyValues.length; ++i){
            let pev = this.possibleEnemyValues[i];
            let enemyOfferValue = Agent.getOfferSumValueWithValues(enemyOffer, pev);
            let myEnemyOfferValue = Agent.getOfferSumValueWithValues(myEnemyOffer, pev);
			if (enemyOfferValue > myEnemyOfferValue){
				res.push(pev)
			}
			else{
				this.log(`exluced: ${pev}`)
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



