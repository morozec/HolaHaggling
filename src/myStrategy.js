'use strict'; /*jslint node:true*/

module.exports = class Agent {
    constructor(me, counts, values, max_rounds, log){
		this.counts = counts;
		
        this.values = values;
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
		
		
		for (var i in this.possibleOffers)
			this.log(this.possibleOffers[i]);

		this.prevOfferIndex = -1;
	}

	getNotZeroValuesOffers(){
		var res = [];
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];
			var hasZeroValue = false;
			for (var i = 0; i < po.length; ++i){
				if (this.values[i] > 0) continue;
				if (po[i] > 0){
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
	
    offer(o){
		this.log(`${this.rounds} rounds left`);	
		
				
        if (o)
        {
			var suggestedSumValue = this.getOfferSumValue(o);			
			this.log(`suggested sum value: ${suggestedSumValue}`);

			if (this.prevOfferIndex >= 0 && suggestedSumValue >= this.getOfferSumValue(this.possibleOffers[this.prevOfferIndex]))
				return;

			if (this.rounds == this.max_rounds)
			{
				for (let i = 0; i<o.length; i++){
					if (o[i] == this.counts[i]){
						//enemy don't need this item. Probably is has zero value for him
						this.enemyZeroIndexes.push(i);
					}
				}
			}

			if (!this.isFirstPlayer && this.rounds == 1) 
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
		}




		/*
		if (!this.myLastOffer)
		{
			o = this.counts.slice();
			var hasZeroCounts = false;
			for (let i = 0; i<o.length; i++)
			{
				if (!this.values[i])
				{
					o[i] = 0;
					hasZeroCounts = true;
				}
			}

			if (!hasZeroCounts){ //exclude offer, where enemy get nothing
				o = this.getNewOffer(o);
			}
		}
		else
		{
			o = this.myLastOffer.slice();
			o = this.getNewOffer(o);
		}
		*/

		var currOfferIndex = this.prevOfferIndex + 1;
		var currOffer = this.possibleOffers[currOfferIndex];
		var mySumValue = this.getOfferSumValue(currOffer);		
		this.log(`my sum value: ${mySumValue}`);		
			
		this.rounds--;
		this.prevOfferIndex = currOfferIndex;
		
		if (suggestedSumValue && mySumValue <= suggestedSumValue)
			return;

        return currOffer;
	}
	
	getNewOffer(o) {

		var index = -1;
		var minValue = Number.MAX_VALUE;
		
		//find item with minimum value and decrement it in my offer
		for (var i = 0; i < this.values.length; ++i)
		{
			if (o[i] == 0) continue;

			//this item probably has zero value for my enemy
			if (this.enemyZeroIndexes.includes(i)){
				o[i] = this.counts[i];
				continue;		
			}

			if (this.values[i] < minValue)
			{
				minValue = this.values[i];
				index = i;
			}
		}

		if (this.myLastOffer && this.values[this.myLastOfferIndex] < this.values[index]){
			o[this.myLastOfferIndex] = this.counts[this.myLastOfferIndex];
		}
		
		
		o[index]--;	
		
		//if current offer if zero value for me or too cheap, suggest preveous one
		var isBadOffer = this.isZeroOffer(o) || this.isPoorOffer(o);
		
		if (isBadOffer) return this.myLastOffer;			
			
		this.myLastOfferIndex = index;	
		return o;
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

	
};

function getOfferSumValue(o, values){
	var sumValue = 0;
	for (var i = 0; i < o.length; ++i){
		sumValue += o[i] * values[i];
	}
	return sumValue;
}

function comparator(values){
	return function(offerA, offerB){
		return -getOfferSumValue(offerA, values) + getOfferSumValue(offerB, values)
	}
}



