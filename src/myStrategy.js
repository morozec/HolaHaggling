'use strict'; /*jslint node:true*/

module.exports = class Agent {	

    constructor(me, counts, values, max_rounds, log){
		this.counts = counts;
		
		this.values = values;
		this.max_rounds = max_rounds
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
		
		for (var i = 1; i < this.possibleOffers.length; ++i){
			var po = this.possibleOffers[i]
			var sumValue = this.getOfferSumValue(po)
			if (sumValue < this.prevOfferValue) return i-1
		}
		return this.possibleOffers.length - 1;
	}

	getNotZeroValuesOffers(){
		var res = [];
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];
			var hasZeroValue = false;
			for (var j = 0; j < po.length; ++j){
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
		var res = [];
		var maxCount = this.getMaxCount();
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];
			var count = this.getOfferCount(po);
			if (count < maxCount) res.push(po);
		}
		return res;
	}

	getEnemyZeroIndexesOffers(){
		var res = [];
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];

			var needRemove = false;
			for (var j = 0; j < po.length; ++j){
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
	
    offer(o){
		const MIN_AVERAGE_ENEMY_VALUE = 3
		this.log(`${this.rounds} rounds left`);
		
		var prevOfferIndex = this.getPreviosOfferIndex()		
        if (o)
        {
			var enemyOffer = this.getEnemyOffer(o);
			if (this.possibleEnemyValues == null){
				this.possibleEnemyValues = this.getPossibleEnemyValues(enemyOffer);				
			}
			else{
				this.possibleEnemyValues = this.updatePossibleEnemyValues(enemyOffer);
			}
			if (prevOfferIndex >= 0)
				this.possibleEnemyValues = this.updatePossibleEnemyValuesByMyOffer(enemyOffer, this.possibleOffers[prevOfferIndex])
			

			this.previousEnemyOffer = enemyOffer;			

			var suggestedSumValue = this.getOfferSumValue(o);			
			this.log(`suggested sum value: ${suggestedSumValue}`);

			if (prevOfferIndex >= 0 && suggestedSumValue >= this.getOfferSumValue(this.possibleOffers[prevOfferIndex]))
				return;
			
			if (this.rounds == this.max_rounds || 
				this.isFirstPlayer && this.rounds == this.max_rounds - 1)
			{
				for (let i = 0; i<o.length; i++){
					if (o[i] == this.counts[i]){
						//enemy don't need this item. Probably is has zero value for him
						this.enemyZeroIndexes.push(i);
					}
				}
				this.possibleOffers = this.getEnemyZeroIndexesOffers();
				//for (var i in this.possibleOffers)
				//	this.log(this.possibleOffers[i]);
			}

			this.possibleOffers.sort(comparator(this.values, this.possibleEnemyValues, this.counts));
			prevOfferIndex = this.getPreviosOfferIndex()				

			for (var i in this.possibleOffers)
				this.log(this.possibleOffers[i]);
			

			if (!this.isFirstPlayer && this.rounds == 1) //I am second and this is the last round
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
			for (var i in this.possibleOffers)
				this.log(this.possibleOffers[i]);
		}
		
		
		
		var currOfferIndex = prevOfferIndex;		
		this.log('')		
		this.log(prevOfferIndex)
		while (currOfferIndex < this.possibleOffers.length - 1){
			currOfferIndex++;	
			
			var currOffer = this.possibleOffers[currOfferIndex];	
			var mySumValue = this.getOfferSumValue(currOffer);			
			this.log(`curr offer: ${currOffer} (${mySumValue})`)	
			
			
			if (currOfferIndex < this.possibleOffers.length - 1 && 
				mySumValue == this.getOfferSumValue(this.possibleOffers[currOfferIndex + 1])) {				
				this.log(`the same my sum value ${mySumValue}`)
				continue
			}
			
			//if current offer if zero value for me or too cheap, suggest preveous one		
			var isBadOffer = this.isZeroOffer(currOffer) || this.isPoorOffer(currOffer);			
			if (isBadOffer){
				currOfferIndex = prevOfferIndex;
				this.log('is bad offer')
				break				
			}				

			currOffer = this.possibleOffers[currOfferIndex]				
			
			var enemyCurrOffer = this.getEnemyOffer(currOffer);		//текущее предложение (если смотреть со стороны соперника)			
			
			if (prevOfferIndex >= 0){		
				
				var prevOffer = this.possibleOffers[prevOfferIndex]
				var myPrevSumValue = this.getOfferSumValue(prevOffer)	//моя выручка с прошлого (отличного от текущего) предложения
				var minEnemyValue = Number.MAX_SAFE_INTEGER; 			//минимальная выручка соперника с текущего предложения
				var maxEnemyValue = 0;									//максимальная выручка соперника с текущего предложения
				var minPrevEnemyValue = Number.MAX_SAFE_INTEGER;		//минимальная выручка соперника с прошлого предложения
				var maxPrevenemyValue = 0;								//максимальная выручка соперника с прошлого предложения
				
				var enemyPrevOffer = this.getEnemyOffer(prevOffer)		//прошлое предложение (если смотреть со стороны соперника)

				var maxEnemyValueWantsNow = 0;							//максимальная выручка, которую может заработать соперник со СВОЕГО предложения

						

				for (var i in this.possibleEnemyValues){
					var pev = this.possibleEnemyValues[i]; 	
					var enemyValue = this.getOfferSumValueWithValues(enemyCurrOffer, pev)
					if (enemyValue < minEnemyValue) minEnemyValue = enemyValue;		
					if (enemyValue < maxEnemyValue) maxEnemyValue = enemyValue;		
					var prevEnemyValue = this.getOfferSumValueWithValues(enemyPrevOffer, pev)				
					if (prevEnemyValue < minPrevEnemyValue) minPrevEnemyValue = prevEnemyValue;
					if (prevEnemyValue > maxPrevenemyValue) maxPrevenemyValue = prevEnemyValue;

					var enemyValueWantsNow = this.getOfferSumValueWithValues(enemyOffer, pev);
					if (enemyValueWantsNow > maxEnemyValueWantsNow) maxEnemyValueWantsNow = enemyValueWantsNow;

					this.log(`${pev} sugg now: ${enemyValue} sugg prev: ${prevEnemyValue} wants now: ${enemyValueWantsNow}`);
				}			
				
				//Мое текущее предложение уменьшает максимальную суммарную выручку игроков (по сравнению с текущим предложением соперника)
				if (suggestedSumValue + maxEnemyValueWantsNow > mySumValue + maxEnemyValue){				
					if (suggestedSumValue >= maxEnemyValueWantsNow){//я заработаю не меньше соперника
						this.log(`fair deal`)
						return;
					}
				}

				//минимальная суммарная выручка с прошлого предложения была >= минимальной суммарной выручке с этого
				if (myPrevSumValue + minPrevEnemyValue >= mySumValue + minEnemyValue){
					if (mySumValue <= minPrevEnemyValue){//моя выручка c этого предложения не больше, чем минимальная выручка соперника с прошлого предложения
						//т.о. максимизируем суммарную выручку и зарабатываем не меньше соперника						
						this.log('previous offer (min)')
						currOfferIndex = prevOfferIndex;
						break
					}
				}
				var averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer)
				var averageEnemyPrevValue = this.getAverageEnemyValue(enemyPrevOffer)
				if (myPrevSumValue + averageEnemyPrevValue > mySumValue + averageEnemyValue){
					this.log('previous offer (max sum value)')
					currOfferIndex = prevOfferIndex;
					break
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
				var averageEnemyValue = this.getAverageEnemyValue(enemyCurrOffer); //средняя выручка соперника с моего текущего предложения			
				//мое текущее предложение достаточно выгодно для соперника
				//нет смысла дальше его уменьшать	
				if (averageEnemyValue >= MIN_AVERAGE_ENEMY_VALUE) break;	
				else this.log(`to bad for my enemy ${averageEnemyValue}`)	
			}	
			else{
				break
			}
		}
		

		
		var currOffer = this.possibleOffers[currOfferIndex];
		var mySumValue = this.getOfferSumValue(currOffer);
		this.prevOfferValue = mySumValue;	
		this.rounds--;		

		if (suggestedSumValue && mySumValue <= suggestedSumValue){			
			this.log("my next offer is not better for me")
			return;
		}

        return currOffer;
	}

	getAverageEnemyValue(offer){
		var res = 0;
		var pevCount = this.possibleEnemyValues.length;
		for (var i = 0; i < pevCount; ++i){
			var pev = this.possibleEnemyValues[i]
			res += this.getOfferSumValueWithValues(offer, pev)
		}
		res /= pevCount;
		return res;
	}
	

	isZeroOffer(o){
		for (var i = 0; i < o.length; ++i)		
			if (o[i] > 0)			
				return false;		
		
		return true;
	}

	isPoorOffer(o){
		var sumValue = this.getOfferSumValue(o);
		return sumValue < this.getMaxSumValue() / 2;
	}

	getMaxSumValue(){
		var sum = 0;
		for (var i = 0; i < this.counts.length; ++i)
			sum += this.counts[i] * this.values[i];
		return sum;
	}

	
		

	getPossibleOffersRec(index){
		var count = this.counts[index];
		var currRes = []
		for (var i = 0; i <= count; ++i){
			currRes.push([i]);
		}

		if (index == this.counts.length - 1)		
			return currRes;
		
		var nextRes = this.getPossibleOffersRec(index + 1);
		var res = [];
		for (var i = 0; i < currRes.length; ++i){				
			for (var arrI in nextRes){				
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
		var count = 0;
		for (var i = 0; i < o.length; ++i)
			count += o[i];
		return count;
	}

	getMaxCount(){
		return this.getOfferCount(this.counts);
	}

	getEnemyOffer(offer){
		var enemyOffer = [];
		for (var i = 0; i < offer.length; ++i){
			enemyOffer.push(this.counts[i] - offer[i]);
		}	
		return enemyOffer;
	}

	getPossibleEnemyValues(enemyOffer){			
		var possibleEnemyValues = this.getPossibleEnemyValuesRec(enemyOffer, this.getMaxSumValue(), 0)
		return possibleEnemyValues;
	}

	getPossibleEnemyValuesRec(offer, currSumValue, index){	
		
		if (index == offer.length - 1){
			if (offer[index] == 0){				
				if (currSumValue == 0) return [0];
				else return null;
			}
			if (currSumValue == 0) return null;
			if (currSumValue % this.counts[index] != 0) return null;
			return [currSumValue / this.counts[index]];
		}

		var variants = []
		if (offer[index] == 0){			
			var nextVariants = this.getPossibleEnemyValuesRec(offer, currSumValue, index + 1)
			for (var i in nextVariants){
				var nextVariant = nextVariants[i];
				if (nextVariant != null)
					variants.push([0].concat(nextVariant))
			}
		}
		else{

			var i = 1;
			while (currSumValue - i * this.counts[index] >= 0){			
				var nextVariants = this.getPossibleEnemyValuesRec(offer, currSumValue - i * this.counts[index], index + 1)
				for (var j in nextVariants){
					var nextVariant = nextVariants[j];					
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
		var res = [];
		
		for (var i = 0; i < this.possibleEnemyValues.length; ++i){
			var pev = this.possibleEnemyValues[i];

			var maxReduced = 0;
			var minNotReduced = Number.MAX_SAFE_INTEGER;
			for (var j = 0; j < pev.length; ++j){			
				
				var delta = enemyOffer[j] - this.previousEnemyOffer[j];

				if (delta < 0){
					if (pev[j] > maxReduced){
						maxReduced = pev[j];
					}					
				}
				else if (delta == 0 && pev[j] != 0){
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
		var res = [];
		var myEnemyOffer = this.getEnemyOffer(myOffer);
		for (var i = 0; i < this.possibleEnemyValues.length; ++i){
			var pev = this.possibleEnemyValues[i];
			var enemyOfferValue = this.getOfferSumValueWithValues(enemyOffer, pev);
			var myEnemyOfferValue = this.getOfferSumValueWithValues(myEnemyOffer, pev);
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
	var sumValue = 0;
	for (var i = 0; i < o.length; ++i){
		sumValue += o[i] * values[i];
	}
	return sumValue;
}

function comparator(values, possibleEnemyValues, counts){
	return function(offerA, offerB){
		var diff = -getOfferSumValue(offerA, values) + getOfferSumValue(offerB, values)
		if (diff != 0 || possibleEnemyValues == null) return diff;
		var aEnemyOffer = getEnemyOffer(offerA,counts)
		var aAverageEnemyValue = getAverageEnemyValue(aEnemyOffer, possibleEnemyValues)
		var bEnemyOffer = getEnemyOffer(offerB, counts)
		var bAverageEnemyOffer = getAverageEnemyValue(bEnemyOffer, possibleEnemyValues)
		return aAverageEnemyValue - bAverageEnemyOffer
	}
}

function getAverageEnemyValue(enemyOffer, possibleEnemyValues){
	var res = 0;
	var pevCount = possibleEnemyValues.length;
	for (var i = 0; i < pevCount; ++i){
		var pev = possibleEnemyValues[i]
		res += getOfferSumValue(enemyOffer, pev)
	}
	res /= pevCount;
	return res;
}

function getEnemyOffer(offer, counts){
	var enemyOffer = [];
	for (var i = 0; i < offer.length; ++i){
		enemyOffer.push(counts[i] - offer[i]);
	}	
	return enemyOffer;
}



